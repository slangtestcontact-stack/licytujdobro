"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { revalidatePublicContent } from "@/lib/public-cache";
import { db } from "@/db";
import {
  campaigns,
  donationVerifications,
  handoverConfirmations,
  meetingProposals,
  meetings,
  meetingReadiness,
  notifications,
  ratings,
  reports,
  transactions,
  transactionEvents,
  transactionCancellations,
  userProfiles,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canTransitionTransaction, type TransactionStatus } from "@/lib/state-machine";
import { generateOneTimeHandoverCode, HANDOVER_CODE_TTL_MS, hashOneTimeHandoverCode, verifyOneTimeHandoverCode } from "@/lib/handover-code";
import { logAudit } from "@/lib/audit";
import {
  assertCanConfirmAlternativePayment,
  assertCanDeferPayment,
  bothPartiesConfirmed,
  validatePlannedDonationAmount,
} from "@/lib/transaction-policy";

export type TransactionResult = { ok: boolean; error?: string; code?: string; expiresAt?: string };
type PartyRole = "buyer" | "seller";

async function getContext(transactionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Musisz być zalogowany.");
  const [transaction] = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  if (!transaction) throw new Error("Nie znaleziono transakcji.");
  const role = user.id === transaction.winnerId
    ? "buyer"
    : user.id === transaction.sellerId
      ? "seller"
      : user.role === "admin"
        ? "admin"
        : null;
  if (!role) throw new Error("Nie masz dostępu do tej transakcji.");
  return { user, transaction, role } as const;
}

function assertTransition(from: string, to: TransactionStatus) {
  if (!canTransitionTransaction(from, to)) throw new Error(`Niedozwolony etap transakcji: ${from} → ${to}.`);
}

function refresh(transactionId: string) {
  revalidatePath(`/transakcje/${transactionId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePublicContent();
}

function selectedDonationAmount(transaction: typeof transactions.$inferSelect) {
  return Number(transaction.plannedDonationAmount ?? transaction.amount);
}

export async function setPlannedDonationAmountAction(transactionId: string, requestedAmount: number): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== "buyer") throw new Error("Kwotę dobrowolnego wsparcia ustala zwycięzca.");
    const requiredAmount = Number(transaction.amount);
    const [campaign] = transaction.campaignId
      ? await db.select().from(campaigns).where(eq(campaigns.id, transaction.campaignId)).limit(1)
      : [];
    const limit = Number(campaign?.paymentLimit ?? 500);
    const amount = validatePlannedDonationAmount({
      requestedAmount,
      requiredAmount,
      paymentLimit: limit,
      transactionStatus: transaction.status,
    });
    await db.transaction(async (tx) => {
      await tx.update(transactions).set({ plannedDonationAmount: String(amount), updatedAt: new Date() }).where(eq(transactions.id, transactionId));
      await tx.insert(transactionEvents).values({
        transactionId,
        actorId: user.id,
        eventType: "DONATION_AMOUNT_SELECTED",
        title: amount > requiredAmount ? "Zwiększono planowaną wpłatę dla Adasia" : "Ustawiono wylicytowaną kwotę wpłaty",
        details: `Kwota obowiązkowa: ${requiredAmount.toFixed(2)} zł. Planowana wpłata: ${amount.toFixed(2)} zł.`,
      });
    });
    await logAudit({ actorId: user.id, action: "USTAWIONO_PLANOWANA_WPLATE", entityType: "transaction", entityId: transactionId, metadata: { requiredAmount, plannedDonationAmount: amount } });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function confirmWinnerAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== "buyer") throw new Error("Tylko zwycięzca może potwierdzić udział.");
    if (transaction.winnerConfirmDeadline < new Date()) throw new Error("Termin potwierdzenia minął.");
    assertTransition(transaction.status, "UMAWIANIE_SPOTKANIA");
    await db.update(transactions).set({
      status: "UMAWIANIE_SPOTKANIA",
      winnerConfirmedAt: new Date(),
      meetingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    }).where(eq(transactions.id, transactionId));
    await db.insert(notifications).values({
      userId: transaction.sellerId,
      type: "NOWA_PROPOZYCJA_SPOTKANIA",
      title: "Zwycięzca potwierdził udział",
      body: "Możecie teraz ustalić publiczne miejsce i termin odbioru.",
      relatedEntityType: "transaction",
      relatedEntityId: transactionId,
    });
    await logAudit({ actorId: user.id, action: "ZWYCIEZCA_POTWIERDZIL_UDZIAL", entityType: "transaction", entityId: transactionId });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

const proposalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeRange: z.string().trim().min(5).max(40),
  location: z.string().trim().min(5).max(200),
  message: z.string().trim().max(500).optional().default(""),
});

export async function proposeMeetingAction(transactionId: string, input: z.infer<typeof proposalSchema>): Promise<TransactionResult> {
  try {
    const { user, transaction } = await getContext(transactionId);
    if (transaction.status !== "UMAWIANIE_SPOTKANIA") throw new Error("Na tym etapie nie można dodawać terminów.");
    const parsed = proposalSchema.safeParse(input);
    if (!parsed.success) throw new Error("Uzupełnij prawidłową datę, godziny i publiczne miejsce.");
    const starts = new Date(`${parsed.data.date}T12:00:00+02:00`);
    if (starts.getTime() <= Date.now()) throw new Error("Termin musi być w przyszłości.");
    if (transaction.meetingDeadline && starts.getTime() > transaction.meetingDeadline.getTime() + 12 * 60 * 60 * 1000) {
      throw new Error("Spotkanie musi odbyć się w ciągu pięciu dni od potwierdzenia wygranej.");
    }
    await db.insert(meetingProposals).values({ transactionId, proposedBy: user.id, ...parsed.data });
    const otherId = user.id === transaction.winnerId ? transaction.sellerId : transaction.winnerId;
    await db.insert(notifications).values({
      userId: otherId,
      type: "NOWA_PROPOZYCJA_SPOTKANIA",
      title: "Nowa propozycja spotkania",
      body: `${parsed.data.date}, ${parsed.data.timeRange} - ${parsed.data.location}`,
      relatedEntityType: "transaction",
      relatedEntityId: transactionId,
    });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function chooseMeetingAction(proposalId: string): Promise<TransactionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Musisz być zalogowany.");
    const [proposal] = await db.select().from(meetingProposals).where(eq(meetingProposals.id, proposalId)).limit(1);
    if (!proposal) throw new Error("Nie znaleziono terminu.");
    const { transaction } = await getContext(proposal.transactionId);
    if (transaction.status !== "UMAWIANIE_SPOTKANIA") throw new Error("Spotkanie zostało już ustalone.");
    if (proposal.proposedBy === user.id) throw new Error("Propozycję musi zaakceptować druga strona.");
    assertTransition(transaction.status, "SPOTKANIE_ZAPLANOWANE");
    await db.transaction(async (tx) => {
      await tx.update(meetingProposals).set({ status: "ODRZUCONY", updatedAt: new Date() }).where(eq(meetingProposals.transactionId, proposal.transactionId));
      await tx.update(meetingProposals).set({ status: "WYBRANY", updatedAt: new Date() }).where(eq(meetingProposals.id, proposalId));
      await tx.insert(meetings).values({
        transactionId: proposal.transactionId,
        chosenProposalId: proposal.id,
        date: proposal.date,
        timeRange: proposal.timeRange,
        location: proposal.location,
        status: "ZAPLANOWANE",
      });
      await tx.update(transactions).set({ status: "SPOTKANIE_ZAPLANOWANE", updatedAt: new Date() }).where(eq(transactions.id, proposal.transactionId));
    });
    refresh(proposal.transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function confirmPresenceAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role === "admin") throw new Error("Administrator nie potwierdza obecności za użytkownika.");
    if (!["SPOTKANIE_ZAPLANOWANE", "OBIE_STRONY_NA_MIEJSCU"].includes(transaction.status)) {
      throw new Error("Obecność można potwierdzić dopiero dla zaplanowanego spotkania.");
    }
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.select().from(transactions).where(eq(transactions.id, transactionId)).for("update");
      await tx.update(transactions).set(role === "buyer"
        ? { buyerConfirmedPresenceAt: now, updatedAt: now }
        : { sellerConfirmedPresenceAt: now, updatedAt: now }).where(eq(transactions.id, transactionId));
      const [fresh] = await tx.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
      if (fresh?.buyerConfirmedPresenceAt && fresh.sellerConfirmedPresenceAt) {
        await tx.update(transactions).set({ status: "OGLEDZINY", updatedAt: now }).where(eq(transactions.id, transactionId));
      }
    });
    await logAudit({ actorId: user.id, action: "POTWIERDZONO_OBECNOSC", entityType: "transaction", entityId: transactionId, metadata: { role } });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function acceptItemAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== "buyer") throw new Error("Stan przedmiotu potwierdza zwycięzca.");
    if (transaction.status !== "OGLEDZINY") throw new Error("Oględziny nie są teraz aktywne.");
    await db.update(transactions).set({
      status: "PRZEDMIOT_ZAAKCEPTOWANY",
      buyerAcceptedItemAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(transactions.id, transactionId));
    await logAudit({ actorId: user.id, action: "ZAAKCEPTOWANO_PRZEDMIOT", entityType: "transaction", entityId: transactionId });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function startDonationAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { transaction, role } = await getContext(transactionId);
    if (role !== "buyer") throw new Error("Tylko zwycięzca może uruchomić etap wpłaty.");
    if (selectedDonationAmount(transaction) > 500) throw new Error("Maksymalna wpłata obsługiwana w tym procesie wynosi 500 zł.");
    if (transaction.campaignId) {
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, transaction.campaignId)).limit(1);
      if (campaign && selectedDonationAmount(transaction) > Number(campaign.paymentLimit)) {
        throw new Error(`Kwota przekracza limit Terminalu ustawiony dla zbiórki: ${Number(campaign.paymentLimit)} zł.`);
      }
    }
    assertTransition(transaction.status, "OCZEKIWANIE_NA_OTWARCIE_TERMINALU");
    await db.update(transactions).set({
      status: "OCZEKIWANIE_NA_OTWARCIE_TERMINALU",
      terminalOpenedAt: null,
      waitingForBlikAt: null,
      buyerDonationConfirmedAt: null,
      sellerDonationConfirmedAt: null,
      donationFailureReason: null,
      updatedAt: new Date(),
    }).where(eq(transactions.id, transactionId));
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function markTerminalOpenedAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== "seller") throw new Error("Terminal otwiera wystawiający na swoim urządzeniu.");
    assertTransition(transaction.status, "TERMINAL_OTWARTY");
    await db.update(transactions).set({ status: "TERMINAL_OTWARTY", terminalOpenedAt: new Date(), updatedAt: new Date() }).where(eq(transactions.id, transactionId));
    await logAudit({ actorId: user.id, action: "OTWARTO_TERMINAL_SIEPOMAGA", entityType: "transaction", entityId: transactionId });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function markWaitingForBlikAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== "seller") throw new Error("Kwotę w Terminalu potwierdza wystawiający.");
    assertTransition(transaction.status, "OCZEKIWANIE_NA_BLIK");
    await db.update(transactions).set({ status: "OCZEKIWANIE_NA_BLIK", waitingForBlikAt: new Date(), updatedAt: new Date() }).where(eq(transactions.id, transactionId));
    await logAudit({ actorId: user.id, action: "TERMINAL_OCZEKUJE_NA_BLIK", entityType: "transaction", entityId: transactionId, metadata: { amount: selectedDonationAmount(transaction), requiredAmount: transaction.amount } });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function confirmSiepomagaSide(transactionId: string, expectedRole: PartyRole): Promise<TransactionResult> {
  try {
    const { user, role } = await getContext(transactionId);
    if (role !== expectedRole) throw new Error(expectedRole === "buyer" ? "Wpłatę w banku potwierdza kupujący." : "Komunikat Terminalu potwierdza wystawiający.");
    const now = new Date();
    let completed = false;
    await db.transaction(async (tx) => {
      const [fresh] = await tx.select().from(transactions).where(eq(transactions.id, transactionId)).for("update");
      if (!fresh) throw new Error("Nie znaleziono transakcji.");
      const allowed = expectedRole === "buyer"
        ? ["OCZEKIWANIE_NA_BLIK", "WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO"]
        : ["OCZEKIWANIE_NA_BLIK", "WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO"];
      if (!allowed.includes(fresh.status)) throw new Error("Potwierdzenie nie jest dostępne na tym etapie.");

      const buyerConfirmedAt = expectedRole === "buyer" ? now : fresh.buyerDonationConfirmedAt;
      const sellerConfirmedAt = expectedRole === "seller" ? now : fresh.sellerDonationConfirmedAt;
      completed = Boolean(buyerConfirmedAt && sellerConfirmedAt);

      if (completed) {
        const [verification] = await tx.select().from(donationVerifications).where(eq(donationVerifications.transactionId, transactionId)).limit(1);
        if (!verification) {
          await tx.insert(donationVerifications).values({
            transactionId,
            code: fresh.donationCode,
            amount: fresh.plannedDonationAmount ?? fresh.amount,
            method: "SIEPOMAGA_TERMINAL_DUAL",
            provider: "SIEPOMAGA",
            buyerConfirmedAt,
            sellerConfirmedAt,
            verifiedBy: user.id,
            verifiedAt: now,
          });
        }
        await tx.update(transactions).set({
          status: "WPLATA_POTWIERDZONA_OBUSTRONNIE",
          buyerDonationConfirmedAt: buyerConfirmedAt,
          sellerDonationConfirmedAt: sellerConfirmedAt,
          qrCode: null,
          handoverCodeHash: null,
          handoverCodeExpiresAt: null,
          handoverCodeUsedAt: null,
          donationFailureReason: null,
          updatedAt: now,
        }).where(eq(transactions.id, transactionId));
      } else {
        await tx.update(transactions).set(expectedRole === "buyer"
          ? {
              status: "WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO",
              buyerDonationConfirmedAt: now,
              updatedAt: now,
            }
          : {
              status: "WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO",
              sellerDonationConfirmedAt: now,
              updatedAt: now,
            }).where(eq(transactions.id, transactionId));
      }
    });
    await logAudit({
      actorId: user.id,
      action: expectedRole === "buyer" ? "KUPUJACY_POTWIERDZIL_WPLATE_SIEPOMAGA" : "SPRZEDAJACY_POTWIERDZIL_TERMINAL_SIEPOMAGA",
      entityType: "transaction",
      entityId: transactionId,
      metadata: { completed },
    });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function confirmBuyerSiepomagaDonationAction(transactionId: string): Promise<TransactionResult> {
  return confirmSiepomagaSide(transactionId, "buyer");
}

export async function confirmSellerSiepomagaDonationAction(transactionId: string): Promise<TransactionResult> {
  return confirmSiepomagaSide(transactionId, "seller");
}

// Alias zachowany dla starszych komponentów i lokalnych danych.
export async function verifyDonationAction(transactionId: string): Promise<TransactionResult> {
  return confirmSellerSiepomagaDonationAction(transactionId);
}

const paymentProblemSchema = z.string().trim().min(5).max(1000);

export async function markSiepomagaPaymentProblemAction(transactionId: string, reason: string): Promise<TransactionResult> {
  try {
    const parsed = paymentProblemSchema.safeParse(reason);
    if (!parsed.success) throw new Error("Krótko opisz, co nie zadziałało.");
    const { user, transaction, role } = await getContext(transactionId);
    if (role === "admin") throw new Error("Problem zgłasza strona spotkania.");
    const paymentStatuses = [
      "OCZEKIWANIE_NA_OTWARCIE_TERMINALU",
      "TERMINAL_OTWARTY",
      "OCZEKIWANIE_NA_BLIK",
      "WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO",
      "WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO",
    ];
    if (!paymentStatuses.includes(transaction.status)) throw new Error("Na tym etapie nie można zgłosić nieudanej wpłaty.");
    const contradictory = Boolean(transaction.buyerDonationConfirmedAt || transaction.sellerDonationConfirmedAt);
    const nextStatus = contradictory ? "WPLATA_WYMAGA_WYJASNIENIA" : "WPLATA_NIEUDANA";
    await db.transaction(async (tx) => {
      await tx.update(transactions).set({ status: nextStatus, donationFailureReason: parsed.data, updatedAt: new Date() }).where(eq(transactions.id, transactionId));
      if (contradictory) {
        await tx.insert(reports).values({
          reporterId: user.id,
          targetType: "TRANSACTION",
          targetId: transactionId,
          reason: "WPLATA_SIEPOMAGA_WYMAGA_WYJASNIENIA",
          comment: parsed.data,
        });
      }
    });
    await logAudit({ actorId: user.id, action: "PROBLEM_Z_WPLATA_SIEPOMAGA", entityType: "transaction", entityId: transactionId, metadata: { role, nextStatus, reason: parsed.data } });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function retrySiepomagaPaymentAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (!['buyer', 'seller'].includes(role)) throw new Error("Brak dostępu.");
    if (transaction.status !== "WPLATA_NIEUDANA") throw new Error("Ponowna próba jest dostępna tylko po nieudanej, niepotwierdzonej wpłacie.");
    assertTransition(transaction.status, "OCZEKIWANIE_NA_OTWARCIE_TERMINALU");
    await db.update(transactions).set({
      status: "OCZEKIWANIE_NA_OTWARCIE_TERMINALU",
      terminalOpenedAt: null,
      waitingForBlikAt: null,
      buyerDonationConfirmedAt: null,
      sellerDonationConfirmedAt: null,
      donationFailureReason: null,
      updatedAt: new Date(),
    }).where(eq(transactions.id, transactionId));
    await logAudit({ actorId: user.id, action: "PONOWIONO_WPLATE_SIEPOMAGA", entityType: "transaction", entityId: transactionId });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function rejectItemAction(transactionId: string, reason: string, comment: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== "buyer" || transaction.status !== "OGLEDZINY") throw new Error("Nie można teraz odrzucić przedmiotu.");
    const parsedReason = z.enum(["INNY_PRZEDMIOT", "USZKODZENIE", "BRAK_ELEMENTOW", "OPIS_NIEZGODNY", "PODROBKA", "INNE"]).safeParse(reason);
    if (!parsedReason.success) throw new Error("Wybierz przyczynę.");
    if (parsedReason.data === "INNE" && comment.trim().length < 10) throw new Error("Opisz problem w co najmniej 10 znakach.");
    await db.update(transactions).set({
      status: "PRZEDMIOT_NIEZGODNY_Z_OPISEM",
      itemRejectedAt: new Date(),
      rejectionReason: parsedReason.data,
      rejectionComment: comment.trim().slice(0, 2000),
      updatedAt: new Date(),
    }).where(eq(transactions.id, transactionId));
    await logAudit({ actorId: user.id, action: "ODRZUCONO_PRZEDMIOT", entityType: "transaction", entityId: transactionId, metadata: { reason: parsedReason.data } });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

function handoverSecret() {
  const secret = process.env.HANDOVER_CODE_SECRET || process.env.SESSION_SECRET || "";
  if (secret.length < 32 || /change-me/i.test(secret)) throw new Error("Ustaw bezpieczny HANDOVER_CODE_SECRET w pliku .env.");
  return secret;
}

export async function generateHandoverCodeAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== "seller") throw new Error("Kod przekazania generuje wystawiający.");
    if (!["WPLATA_POTWIERDZONA_OBUSTRONNIE", "PRZEDMIOT_PRZEKAZANY"].includes(transaction.status)) {
      throw new Error("Kod można wygenerować dopiero po potwierdzeniu wpłaty przez obie strony.");
    }
    if (transaction.buyerConfirmedHandoverAt) throw new Error("Kupujący potwierdził już odbiór przedmiotu.");
    const code = generateOneTimeHandoverCode();
    const expiresAt = new Date(Date.now() + HANDOVER_CODE_TTL_MS);
    const codeHash = hashOneTimeHandoverCode(transactionId, code, handoverSecret());
    await db.transaction(async (tx) => {
      await tx.update(transactions).set({ handoverCodeHash: codeHash, handoverCodeExpiresAt: expiresAt, handoverCodeUsedAt: null, qrCode: null, updatedAt: new Date() }).where(eq(transactions.id, transactionId));
      await tx.insert(handoverConfirmations).values({ transactionId, codeHash, codeExpiresAt: expiresAt, qrCode: null }).onConflictDoUpdate({
        target: handoverConfirmations.transactionId,
        set: { codeHash, codeExpiresAt: expiresAt, codeUsedAt: null, buyerConfirmedAt: null, sellerConfirmedAt: null, qrCode: null, updatedAt: new Date() },
      });
    });
    await logAudit({ actorId: user.id, action: "WYGENEROWANO_JEDNORAZOWY_KOD_PRZEKAZANIA", entityType: "transaction", entityId: transactionId, metadata: { expiresAt: expiresAt.toISOString() } });
    refresh(transactionId);
    return { ok: true, code, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function confirmHandoverAction(transactionId: string, code = ""): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (!["buyer", "seller"].includes(role)) throw new Error("Brak dostępu.");
    if (!["WPLATA_POTWIERDZONA_OBUSTRONNIE", "PRZEDMIOT_PRZEKAZANY"].includes(transaction.status)) {
      throw new Error("Przekazanie jest odblokowane dopiero po potwierdzeniu wpłaty przez obie strony.");
    }
    const now = new Date();
    let completed = false;
    await db.transaction(async (tx) => {
      const [freshTransaction] = await tx.select().from(transactions).where(eq(transactions.id, transactionId)).for("update");
      const [handover] = await tx.select().from(handoverConfirmations).where(eq(handoverConfirmations.transactionId, transactionId)).for("update");
      if (!freshTransaction || !handover) throw new Error("Wystawiający musi najpierw wygenerować kod przekazania.");

      if (role === "buyer") {
        const normalized = code.replace(/\s/g, "");
        if (!/^\d{6}$/.test(normalized)) throw new Error("Wpisz sześciocyfrowy kod przekazania.");
        if (!handover.codeHash || !handover.codeExpiresAt) throw new Error("Kod przekazania nie został wygenerowany.");
        if (handover.codeUsedAt || freshTransaction.handoverCodeUsedAt) throw new Error("Ten kod został już użyty.");
        if (handover.codeExpiresAt <= now) throw new Error("Kod wygasł. Wystawiający powinien wygenerować nowy.");
        if (!verifyOneTimeHandoverCode(handover.codeHash, transactionId, normalized, handoverSecret())) throw new Error("Nieprawidłowy kod przekazania.");
        await tx.update(handoverConfirmations).set({ buyerConfirmedAt: now, codeUsedAt: now, updatedAt: now }).where(eq(handoverConfirmations.id, handover.id));
        await tx.update(transactions).set({ buyerConfirmedHandoverAt: now, handoverCodeUsedAt: now, status: "PRZEDMIOT_PRZEKAZANY", updatedAt: now }).where(eq(transactions.id, transactionId));
      } else {
        if (!handover.buyerConfirmedAt && !freshTransaction.buyerConfirmedHandoverAt) throw new Error("Najpierw kupujący musi wpisać kod i potwierdzić odbiór.");
        await tx.update(handoverConfirmations).set({ sellerConfirmedAt: now, updatedAt: now }).where(eq(handoverConfirmations.id, handover.id));
        await tx.update(transactions).set({ sellerConfirmedHandoverAt: now, status: "PRZEDMIOT_PRZEKAZANY", updatedAt: now }).where(eq(transactions.id, transactionId));
      }

      const [fresh] = await tx.select().from(handoverConfirmations).where(eq(handoverConfirmations.id, handover.id)).limit(1);
      completed = Boolean(fresh?.buyerConfirmedAt && fresh.sellerConfirmedAt);
      if (completed) {
        await tx.update(transactions).set({ status: "ZAKONCZONA_POMYSLNIE", updatedAt: now }).where(eq(transactions.id, transactionId));
        const [buyerProfile] = await tx.select().from(userProfiles).where(eq(userProfiles.userId, transaction.winnerId)).limit(1);
        const [sellerProfile] = await tx.select().from(userProfiles).where(eq(userProfiles.userId, transaction.sellerId)).limit(1);
        if (buyerProfile) await tx.update(userProfiles).set({ completedTransactions: buyerProfile.completedTransactions + 1, totalForCampaign: String(Number(buyerProfile.totalForCampaign) + selectedDonationAmount(transaction)), updatedAt: now }).where(eq(userProfiles.id, buyerProfile.id));
        if (sellerProfile) await tx.update(userProfiles).set({ completedTransactions: sellerProfile.completedTransactions + 1, totalForCampaign: String(Number(sellerProfile.totalForCampaign) + selectedDonationAmount(transaction)), updatedAt: now }).where(eq(userProfiles.id, sellerProfile.id));
        if (transaction.campaignId) {
          const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, transaction.campaignId)).limit(1);
          if (campaign) await tx.update(campaigns).set({ currentAmount: String(Number(campaign.currentAmount) + selectedDonationAmount(transaction)), updatedAt: now }).where(eq(campaigns.id, campaign.id));
        }
        await tx.insert(notifications).values([
          { userId: transaction.winnerId, type: "PROSBA_O_OCENE", title: "Przedmiot odebrany", body: "Transakcja została zakończona. Wystaw ocenę drugiej stronie.", relatedEntityType: "transaction", relatedEntityId: transactionId },
          { userId: transaction.sellerId, type: "PROSBA_O_OCENE", title: "Przedmiot przekazany", body: "Transakcja została zakończona. Wystaw ocenę drugiej stronie.", relatedEntityType: "transaction", relatedEntityId: transactionId },
        ]);
      }
    });
    await logAudit({ actorId: user.id, action: role === "buyer" ? "KUPUJACY_POTWIERDZIL_ODBIOR_KODEM" : "SPRZEDAJACY_POTWIERDZIL_WYDANIE", entityType: "transaction", entityId: transactionId, metadata: { completed } });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function markNoShowAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (!['buyer', 'seller'].includes(role)) throw new Error('Tylko strona transakcji może zgłosić nieobecność.');
    if (transaction.status !== 'SPOTKANIE_ZAPLANOWANE') throw new Error('Nieobecność można zgłosić tylko dla zaplanowanego spotkania.');
    const nextStatus = role === 'buyer' ? 'NIEOBECNOSC_WYSTAWIAJACEGO' : 'NIEOBECNOSC_KUPUJACEGO';
    assertTransition(transaction.status, nextStatus);
    const absentUserId = role === 'buyer' ? transaction.sellerId : transaction.winnerId;
    await db.transaction(async (tx) => {
      await tx.update(transactions).set({ status: nextStatus, updatedAt: new Date() }).where(eq(transactions.id, transactionId));
      await tx.insert(reports).values({ reporterId: user.id, targetType: 'TRANSACTION', targetId: transactionId, reason: nextStatus, comment: 'Druga strona nie pojawiła się na ustalonym spotkaniu.' });
      await tx.insert(notifications).values({ userId: absentUserId, type: 'NOWE_ZGLOSZENIE', title: 'Zgłoszono nieobecność', body: 'Druga strona zgłosiła, że nie pojawiłeś(-aś) się na ustalonym spotkaniu. Sprawę przejrzy administrator.', relatedEntityType: 'transaction', relatedEntityId: transactionId });
    });
    await logAudit({ actorId: user.id, action: 'ZGLOSZONO_NIEOBECNOSC', entityType: 'transaction', entityId: transactionId, metadata: { role, nextStatus } });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

// Zachowany alias ze starszej wersji interfejsu.
export async function markDonationUnconfirmedAction(transactionId: string): Promise<TransactionResult> {
  return markSiepomagaPaymentProblemAction(transactionId, "Terminal Siepomaga nie potwierdził wpłaty podczas spotkania.");
}

export async function reportRefusalAfterDonationAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== 'buyer') throw new Error('Odmowę przekazania zgłasza kupujący.');
    if (!["WPLATA_POTWIERDZONA_OBUSTRONNIE", "PRZEDMIOT_PRZEKAZANY"].includes(transaction.status)) {
      throw new Error('Odmowę można zgłosić po potwierdzeniu wpłaty.');
    }
    if (transaction.status !== "PRZEDMIOT_PRZEKAZANY") assertTransition(transaction.status, 'ODMOWA_PRZEKAZANIA');
    await db.transaction(async (tx) => {
      await tx.update(transactions).set({ status: 'ODMOWA_PRZEKAZANIA', updatedAt: new Date() }).where(eq(transactions.id, transactionId));
      await tx.insert(reports).values({ reporterId: user.id, targetType: 'TRANSACTION', targetId: transactionId, reason: 'ODMOWA_PRZEKAZANIA_PO_WPLACIE', comment: 'Wpłata przez Terminal Siepomaga została obustronnie potwierdzona, ale wystawiający odmówił przekazania przedmiotu.' });
      await tx.insert(notifications).values({ userId: transaction.sellerId, type: 'NOWE_ZGLOSZENIE', title: 'Krytyczne zgłoszenie transakcji', body: 'Kupujący zgłosił odmowę przekazania przedmiotu po potwierdzeniu wpłaty.', relatedEntityType: 'transaction', relatedEntityId: transactionId });
    });
    await logAudit({ actorId: user.id, action: 'ODMOWA_PRZEKAZANIA_PO_WPLACIE', entityType: 'transaction', entityId: transactionId });
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function rateTransactionAction(transactionId: string, stars: number, comment: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (transaction.status !== "ZAKONCZONA_POMYSLNIE") throw new Error("Ocenę można wystawić po zakończeniu transakcji.");
    if (role === "admin") throw new Error("Administrator nie może wystawiać ocen w imieniu stron.");
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error("Ocena musi wynosić od 1 do 5.");
    const ratedId = role === "buyer" ? transaction.sellerId : transaction.winnerId;
    await db.insert(ratings).values({ transactionId, raterId: user.id, ratedId, role: role === "buyer" ? "SPRZEDAJACY" : "KUPUJACY", stars, comment: comment.trim().slice(0, 1000) });
    const all = await db.select().from(ratings).where(and(eq(ratings.ratedId, ratedId), eq(ratings.isApproved, true)));
    const avg = all.reduce((sum, item) => sum + item.stars, 0) / Math.max(1, all.length);
    await db.update(userProfiles).set({ ratingAvg: avg.toFixed(2), ratingCount: all.length, updatedAt: new Date() }).where(eq(userProfiles.userId, ratedId));
    refresh(transactionId);
    return { ok: true };
  } catch (error) {
    const message = (error as Error).message.includes("ratings_transaction_rater_unique") ? "Ocena została już wystawiona." : (error as Error).message;
    return { ok: false, error: message };
  }
}


export async function choosePaymentFlowAction(transactionId: string, flow: "TERMINAL_BLIK" | "SIEPOMAGA_ONLINE" | "TRADITIONAL_TRANSFER"): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (role !== "buyer") throw new Error("Sposób wpłaty wybiera kupujący.");
    if (transaction.status !== "PRZEDMIOT_ZAAKCEPTOWANY") throw new Error("Sposób wpłaty można wybrać po zaakceptowaniu przedmiotu.");
    const nextStatus = flow === "TERMINAL_BLIK" ? "OCZEKIWANIE_NA_OTWARCIE_TERMINALU" : flow === "TRADITIONAL_TRANSFER" ? "OCZEKUJE_NA_WERYFIKACJE" : "OCZEKUJE_NA_PLATNOSC";
    await db.transaction(async (tx) => {
      await tx.update(transactions).set({ paymentFlow: flow, paymentMethod: flow, status: nextStatus, updatedAt: new Date() }).where(eq(transactions.id, transactionId));
      await tx.insert(transactionEvents).values({ transactionId, actorId: user.id, eventType: "PAYMENT_FLOW_SELECTED", title: "Wybrano sposób wpłaty", details: flow });
    });
    refresh(transactionId); return { ok: true };
  } catch (error) { return { ok: false, error: (error as Error).message }; }
}

export async function deferPaymentAction(transactionId: string, reason: string): Promise<TransactionResult> {
  try {
    const { user, transaction } = await getContext(transactionId);
    assertCanDeferPayment(transaction.status);
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.transaction(async (tx) => {
      await tx.update(transactions).set({ status: "PLATNOSC_ODLOZONA", paymentDeferredUntil: until, paymentProblemType: "BRAK_INTERNETU_LUB_AWARIA", paymentProblemNote: reason, updatedAt: new Date() }).where(eq(transactions.id, transactionId));
      await tx.insert(transactionEvents).values({ transactionId, actorId: user.id, eventType: "PAYMENT_DEFERRED", title: "Wpłata została odłożona", details: `${reason}. Termin: ${until.toISOString()}` });
    });
    refresh(transactionId); return { ok: true };
  } catch (error) { return { ok: false, error: (error as Error).message }; }
}

export async function reportTransactionProblemAction(transactionId: string, type: string, note: string): Promise<TransactionResult> {
  try {
    const { user, transaction } = await getContext(transactionId);
    await db.transaction(async (tx) => {
      await tx.insert(reports).values({ reporterId: user.id, targetType: "TRANSACTION", targetId: transactionId, reason: type, comment: note || type });
      if (["REZYGNACJA_ZWYCIEZCY","NIEZGODNY_PRZEDMIOT","BRAK_WPLATY","BRAK_KONTAKTU","NIEOBECNOSC","PROBLEM_BEZPIECZENSTWA","ANULOWANIE_PRZED_KONCEM"].includes(type)) await tx.insert(transactionCancellations).values({ transactionId, listingId: transaction.listingId, requestedBy: user.id, reason: type, details: note || type });
      await tx.insert(transactionEvents).values({ transactionId, actorId: user.id, eventType: "PROBLEM_REPORTED", title: "Zgłoszono problem", details: `${type}: ${note}` });
      if (["BRAK_INTERNETU","BANK_LUB_SIEPOMAGA","WPLATA_NIEWIDOCZNA"].includes(type)) await tx.update(transactions).set({ status: "PROBLEM_Z_PLATNOSCIA", paymentProblemType: type, paymentProblemNote: note, updatedAt: new Date() }).where(eq(transactions.id, transactionId));
    });
    refresh(transactionId); return { ok: true };
  } catch (error) { return { ok: false, error: (error as Error).message }; }
}


const readinessSchema = z.object({
  phoneCharged: z.boolean(),
  internetAvailable: z.boolean(),
  paymentAvailable: z.boolean(),
  exactAmountKnown: z.boolean(),
  publicPlaceConfirmed: z.boolean(),
  itemPrepared: z.boolean(),
  preferredPayment: z.enum(["TERMINAL_BLIK", "SIEPOMAGA_ONLINE", "TRADITIONAL_TRANSFER"]),
});

export async function saveMeetingReadinessAction(transactionId: string, input: z.infer<typeof readinessSchema>): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    if (!["buyer", "seller"].includes(role)) throw new Error("Tylko strony transakcji mogą potwierdzić gotowość.");
    if (transaction.status !== "SPOTKANIE_ZAPLANOWANE") throw new Error("Checklistę można potwierdzić przed zaplanowanym spotkaniem.");
    const parsed = readinessSchema.safeParse(input);
    if (!parsed.success) throw new Error("Uzupełnij checklistę gotowości.");
    const data = parsed.data;
    const required = role === "buyer"
      ? [data.phoneCharged, data.internetAvailable, data.paymentAvailable, data.exactAmountKnown, data.publicPlaceConfirmed]
      : [data.phoneCharged, data.internetAvailable, data.exactAmountKnown, data.publicPlaceConfirmed, data.itemPrepared];
    if (required.some((value) => !value)) throw new Error("Potwierdź wszystkie wymagane punkty przed spotkaniem.");
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(meetingReadiness).values({ transactionId, userId: user.id, ...data, confirmedAt: now }).onConflictDoUpdate({
        target: [meetingReadiness.transactionId, meetingReadiness.userId],
        set: { ...data, confirmedAt: now, updatedAt: now },
      });
      await tx.insert(transactionEvents).values({ transactionId, actorId: user.id, eventType: "MEETING_READINESS_CONFIRMED", title: "Potwierdzono gotowość przed spotkaniem", details: role === "buyer" ? `Kupujący wybrał: ${data.preferredPayment}` : "Wystawiający potwierdził przygotowanie przedmiotu." });
    });
    refresh(transactionId);
    return { ok: true };
  } catch (error) { return { ok: false, error: (error as Error).message }; }
}

export async function confirmAlternativePaymentAction(transactionId: string): Promise<TransactionResult> {
  try {
    const { user, transaction, role } = await getContext(transactionId);
    assertCanConfirmAlternativePayment({
      status: transaction.status,
      paymentFlow: transaction.paymentFlow,
      role,
    });
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(transactions).set(role === "buyer" ? { buyerDonationConfirmedAt: now, updatedAt: now } : { sellerDonationConfirmedAt: now, updatedAt: now }).where(eq(transactions.id, transactionId));
      const [fresh] = await tx.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
      const both = bothPartiesConfirmed({
        buyerDonationConfirmedAt: fresh?.buyerDonationConfirmedAt ?? null,
        sellerDonationConfirmedAt: fresh?.sellerDonationConfirmedAt ?? null,
      });
      if (both) await tx.update(transactions).set({ status: "WPLATA_POTWIERDZONA_OBUSTRONNIE", updatedAt: now }).where(eq(transactions.id, transactionId));
      await tx.insert(transactionEvents).values({ transactionId, actorId: user.id, eventType: "ALTERNATIVE_PAYMENT_CONFIRMED", title: role === "buyer" ? "Kupujący potwierdził wykonanie wpłaty" : "Wystawiający potwierdził poprawny wynik wpłaty", details: transaction.paymentFlow });
    });
    refresh(transactionId);
    return { ok: true };
  } catch (error) { return { ok: false, error: (error as Error).message }; }
}
