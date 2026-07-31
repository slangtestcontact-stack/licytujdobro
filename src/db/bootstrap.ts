import "dotenv/config";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq, inArray, ne, or, sql } from "drizzle-orm";

import { db, pool } from "@/db";
import {
  adminSettings,
  auctions,
  campaignUpdates,
  campaigns,
  categories,
  listings,
  supportTeams,
  transactions,
  userProfiles,
  users,
} from "@/db/schema";
import {
  ADAS_CAMPAIGN,
  ADAS_VERIFICATION_INFO,
} from "@/lib/adas-campaign";
import { ALLOWED_CATEGORY_SEED } from "@/lib/config";

const PUBLIC_CODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPublicCode(length = 8): string {
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => {
    const index = byte % PUBLIC_CODE_ALPHABET.length;
    return PUBLIC_CODE_ALPHABET[index];
  }).join("");
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Brak ${name} w pliku .env.`);
  }

  return value;
}

async function configureAdasCampaign(): Promise<string> {
  let campaignId = "";

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(campaigns)
      .where(eq(campaigns.externalSlug, ADAS_CAMPAIGN.externalSlug))
      .limit(1);

    const values = {
      name: ADAS_CAMPAIGN.campaignName,
      beneficiaryName: ADAS_CAMPAIGN.beneficiaryName,
      description: ADAS_CAMPAIGN.description,

      // Prawdziwe zdjęcie zapisane w:
      // public/images/adas-iwanejko.jpg
      imageUrl: "/images/adas-iwanejko.jpg",

      externalUrl: ADAS_CAMPAIGN.officialCampaignUrl,
      provider: "SIEPOMAGA",
      externalSlug: ADAS_CAMPAIGN.externalSlug,
      piggyBankUrl: ADAS_CAMPAIGN.piggyBankUrl,
      terminalUrl: ADAS_CAMPAIGN.terminalUrl,
      paymentLimit: String(ADAS_CAMPAIGN.paymentLimit),
      verificationMode: "SIEPOMAGA_TERMINAL_DUAL_CONFIRMATION",
      organizerName: ADAS_CAMPAIGN.organizerName,
      verificationInfo: ADAS_VERIFICATION_INFO,
      targetAmount: null,
      isActive: true,
      isVisible: true,
      isDemo: false,
      updatedAt: new Date(),
    } as const;

    if (existing) {
      campaignId = existing.id;

      await tx
        .update(campaigns)
        .set(values)
        .where(eq(campaigns.id, existing.id));
    } else {
      const [created] = await tx
        .insert(campaigns)
        .values({
          ...values,
          currentAmount: "0",
          updatesJson: [],
        })
        .returning();

      if (!created) {
        throw new Error("Nie udało się utworzyć kampanii Adasia.");
      }

      campaignId = created.id;
    }

    // W obecnej wersji aktywna ma być tylko kampania Adasia.
    // Nie wyłączamy kampanii Adasia, tylko pozostałe rekordy.
    await tx
      .update(campaigns)
      .set({
        isActive: false,
        isVisible: false,
        updatedAt: new Date(),
      })
      .where(ne(campaigns.id, campaignId));

    await tx
      .update(auctions)
      .set({
        campaignId,
        updatedAt: new Date(),
      })
      .where(inArray(auctions.status, ["ZATWIERDZONA", "AKTYWNA"]));
  });

  if (!campaignId) {
    throw new Error("Nie udało się ustalić ID kampanii Adasia.");
  }

  return campaignId;
}

async function cleanLegacyDemoLabels(
  campaignId: string,
  pilotCity: string,
): Promise<void> {
  const legacyCities = [
    "Warszawa",
    "Warszawa i okolice",
  ];

  const legacyDistricts = [
    "Mokotów",
    "Śródmieście",
    "Ursynów",
    "Wola",
    "Praga",
  ];

  // Poprawiamy tylko rozpoznawalne dane demonstracyjne.
  // Nie nadpisujemy każdej lokalizacji użytkowników.
  await db
    .update(listings)
    .set({
      city: pilotCity,
      district: ADAS_CAMPAIGN.regionLabel,
      updatedAt: new Date(),
    })
    .where(
      or(
        inArray(listings.city, legacyCities),
        inArray(listings.district, legacyDistricts),
      ),
    );

  // Aktualizujemy transakcje przypisane do kampanii Adasia
  // albo rozpoznawalnej starej kampanii demonstracyjnej.
  await db
    .update(transactions)
    .set({
      campaignId,
      campaignNameSnapshot: ADAS_CAMPAIGN.campaignName,
      campaignUrlSnapshot: ADAS_CAMPAIGN.officialCampaignUrl,
      piggyBankUrlSnapshot: ADAS_CAMPAIGN.piggyBankUrl,
      terminalUrlSnapshot: ADAS_CAMPAIGN.terminalUrl,
      campaignProviderSnapshot: "SIEPOMAGA",
      updatedAt: new Date(),
    })
    .where(
      or(
        eq(transactions.campaignId, campaignId),
        eq(
          transactions.campaignNameSnapshot,
          "Pomoc dla Zosi - leczenie i rehabilitacja (DEMO)",
        ),
      ),
    );

  const rows = await db
    .select({
      id: listings.id,
      shortCode: listings.shortCode,
    })
    .from(listings);

  for (const row of rows) {
    if (row.shortCode) {
      continue;
    }

    await db
      .update(listings)
      .set({
        shortCode: randomPublicCode(),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, row.id));
  }
}


async function migrateLegacyTransactionStatuses(): Promise<void> {
  // Jednorazowo porządkuje stare aliasy. Kod aplikacji nie używa ich już w maszynie stanów.
  await db.execute(sql`
    update transactions
    set status = case
      when status::text = 'OCZEKIWANIE_NA_WPLATE' then 'OCZEKUJE_NA_PLATNOSC'::transaction_status
      when status::text in ('WPLATA_ZWERYFIKOWANA', 'WPLATA_POTWIERDZONA') then 'WPLATA_POTWIERDZONA_OBUSTRONNIE'::transaction_status
      else status
    end,
    updated_at = now()
    where status::text in ('OCZEKIWANIE_NA_WPLATE', 'WPLATA_ZWERYFIKOWANA', 'WPLATA_POTWIERDZONA')
  `);
}

async function configureSettings(pilotCity: string): Promise<void> {
  const settings = [
    {
      key: "pilotCity",
      value: pilotCity,
    },
    {
      key: "pilotRegionLabel",
      value: ADAS_CAMPAIGN.regionLabel,
    },
    {
      key: "maxItemValue",
      value: 500,
    },
    {
      key: "maxActiveListingsPerUser",
      value: 2,
    },
    {
      key: "auctionDurations",
      value: [3, 5, 7],
    },
    {
      key: "maxExtensionMinutes",
      value: 20,
    },
  ];

  for (const setting of settings) {
    await db
      .insert(adminSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: {
          value: setting.value,
          updatedAt: new Date(),
        },
      });
  }
}

async function configureCategories(): Promise<void> {
  for (const name of ALLOWED_CATEGORY_SEED) {
    await db
      .insert(categories)
      .values({
        slug: slugify(name),
        name,
        isAllowed: true,
        maxValue: "500",
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name,
          isAllowed: true,
          maxValue: "500",
          updatedAt: new Date(),
        },
      });
  }
}

async function configureSupportTeam(): Promise<void> {
  const name = "Społeczność Biłgoraja dla Adasia";
  const description =
    "Otwarta drużyna mieszkańców Biłgoraja i okolic, którzy wspólnie wystawiają przedmioty i promują aukcje dla Adasia.";

  await db
    .insert(supportTeams)
    .values({
      slug: "spolecznosc-bilgoraja",
      name,
      description,
      joinCode: "ADAS2026",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: supportTeams.slug,
      set: {
        name,
        description,
        isActive: true,
        updatedAt: new Date(),
      },
    });
}

async function configureWelcomeUpdate(
  campaignId: string,
): Promise<void> {
  const title = "Licytujemy razem dla Adasia";

  const [welcomeUpdate] = await db
    .select()
    .from(campaignUpdates)
    .where(eq(campaignUpdates.title, title))
    .limit(1);

  if (welcomeUpdate) {
    return;
  }

  await db.insert(campaignUpdates).values({
    campaignId,
    title,
    body:
      "Najważniejszym celem LicytujDobro jest zwiększanie pomocy dla Adasia. " +
      "Każdy może wpłacić bezpośrednio na Skarbonkę, licytować przedmioty " +
      "albo udostępniać akcję kolejnym osobom.",
    isPublished: true,
  });
}

async function configureAdministrator(
  pilotCity: string,
): Promise<string> {
  const adminEmail = required("ADMIN_EMAIL").toLowerCase();
  const adminPhone = required("ADMIN_PHONE");
  const adminPassword = required("ADMIN_PASSWORD");

  if (
    adminPassword.length < 12 ||
    /change|haslo123/i.test(adminPassword)
  ) {
    throw new Error(
      "ADMIN_PASSWORD musi mieć co najmniej 12 znaków " +
      "i nie może być hasłem przykładowym.",
    );
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  let admin = existing;

  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const now = new Date();

    [admin] = await db
      .insert(users)
      .values({
        email: adminEmail,
        phone: adminPhone,
        passwordHash,
        firstName:
          process.env.ADMIN_FIRST_NAME?.trim() || "Administrator",
        nickname:
          process.env.ADMIN_NICKNAME?.trim() || "Administrator",
        city: pilotCity,
        role: "admin",
        status: "aktywne",
        isAdultConfirmed: true,
        acceptedTermsAt: now,
        acceptedPrivacyAt: now,
        acceptedBiddingRulesAt: now,
        biddingTermsVersion: "2026-07-v1",
        biddingTermsAcceptedAt: now,
        onboardingCompletedAt: now,
        emailVerifiedAt: now,
        phoneVerifiedAt: now,
      })
      .returning();
  } else if (
    admin.role !== "admin" ||
    admin.status !== "aktywne"
  ) {
    [admin] = await db
      .update(users)
      .set({
        role: "admin",
        status: "aktywne",
        city: pilotCity,
        updatedAt: new Date(),
      })
      .where(eq(users.id, admin.id))
      .returning();
  }

  if (!admin) {
    throw new Error("Nie udało się utworzyć konta administratora.");
  }

  await db
    .insert(userProfiles)
    .values({
      userId: admin.id,
      avatarEmoji: "AD",
    })
    .onConflictDoNothing({
      target: userProfiles.userId,
    });

  return adminEmail;
}

async function main(): Promise<void> {
  const pilotCity =
    process.env.PILOT_CITY?.trim() || ADAS_CAMPAIGN.pilotCity;

  await migrateLegacyTransactionStatuses();
  await configureSettings(pilotCity);
  await configureCategories();

  const campaignId = await configureAdasCampaign();

  await cleanLegacyDemoLabels(campaignId, pilotCity);
  await configureSupportTeam();
  await configureWelcomeUpdate(campaignId);

  const adminEmail = await configureAdministrator(pilotCity);

  console.log("Konfiguracja podstawowa gotowa.");
  console.log(`Administrator: ${adminEmail}`);
  console.log(
    `Aktywna zbiórka: ${ADAS_CAMPAIGN.campaignName} (${campaignId})`,
  );
  console.log(`Region pilotażu: ${ADAS_CAMPAIGN.regionLabel}`);
  console.log("Zdjęcie kampanii: /images/adas-iwanejko.jpg");
  console.log(
    "Przed publikacją potwierdź pisemną zgodę " +
    "na wykorzystanie zdjęcia i historii Adasia.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });