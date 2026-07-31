import "dotenv/config";
import { db, pool } from "@/db";
import {
  users,
  userProfiles,
  campaigns,
  categories,
  listings,
  listingPhotos,
  listingVerificationPhotos,
  auctions,
  bids,
  watchlists,
  transactions,
  ratings,
  handoverConfirmations,
  donationVerifications,
  adminSettings,
  auditEvents,
  meetingProposals,
  meetings,
  sessions,
  userVerifications,
  userPenalties,
  notifications,
  reports,
  disputes,
  moderationActions,
  auctionExtensions,
} from "@/db/schema";
import bcrypt from "bcryptjs";
import { ALLOWED_CATEGORY_SEED } from "@/lib/config";
import { generateDonationCode } from "@/lib/auction-logic";

async function main() {
  console.log("Czyszczenie istniejących danych demo...");
  await db.delete(auditEvents);
  await db.delete(notifications);
  await db.delete(disputes);
  await db.delete(reports);
  await db.delete(moderationActions);
  await db.delete(userPenalties);
  await db.delete(donationVerifications);
  await db.delete(handoverConfirmations);
  await db.delete(ratings);
  await db.delete(meetings);
  await db.delete(meetingProposals);
  await db.delete(transactions);
  await db.delete(watchlists);
  await db.delete(auctionExtensions);
  await db.delete(bids);
  await db.delete(auctions);
  await db.delete(listingVerificationPhotos);
  await db.delete(listingPhotos);
  await db.delete(listings);
  await db.delete(categories);
  await db.delete(campaigns);
  await db.delete(sessions);
  await db.delete(userVerifications);
  await db.delete(userProfiles);
  await db.delete(adminSettings);
  await db.delete(users);

  console.log("Ustawienia administracyjne...");
  await db.insert(adminSettings).values([
    { key: "pilotCity", value: "Biłgoraj" },
    { key: "maxItemValue", value: 500 },
    { key: "maxActiveListingsPerUser", value: 5 },
    { key: "auctionDurations", value: [3, 5, 7] },
    { key: "maxExtensionMinutes", value: 20 },
    {
      key: "safetyMessages",
      value: [
        "Wybieraj publiczne miejsca spotkań.",
        "Nie wpłacaj przed obejrzeniem przedmiotu.",
        "Nie przekazuj przedmiotu przed potwierdzeniem wpłaty.",
        "Nie przesyłaj pieniędzy bezpośrednio innemu użytkownikowi.",
        "Zgłaszaj próby przenoszenia transakcji poza platformę.",
      ],
    },
  ]);

  console.log("Kategorie...");
  const categoryRows = await db
    .insert(categories)
    .values(ALLOWED_CATEGORY_SEED.map((name) => ({ slug: slugify(name), name, isAllowed: true })))
    .returning();
  const cat = (name: string) => categoryRows.find((c) => c.name === name)!.id;

  console.log("Użytkownicy...");
  const passwordHash = await bcrypt.hash("Haslo123!", 10);
  const now = new Date();
  const verified = { emailVerifiedAt: now, phoneVerifiedAt: now, status: "aktywne" as const, isAdultConfirmed: true, acceptedTermsAt: now, acceptedPrivacyAt: now, acceptedBiddingRulesAt: now };

  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@licytujdobro.pl",
      phone: "+48500000000",
      firstName: "Admina",
      nickname: "Admin",
      city: "Biłgoraj",
      passwordHash,
      role: "admin",
      ...verified,
    })
    .returning();

  const demoUsersData = [
    { email: "anna@example.com", nickname: "AniaW", firstName: "Anna", lastName: "Wiśniewska", city: "Biłgoraj" },
    { email: "marek@example.com", nickname: "MarekK", firstName: "Marek", lastName: "Kowalski", city: "Biłgoraj" },
    { email: "kasia@example.com", nickname: "KasiaZ", firstName: "Katarzyna", lastName: "Zielińska", city: "Biłgoraj" },
    { email: "piotr@example.com", nickname: "PiotrN", firstName: "Piotr", lastName: "Nowak", city: "Biłgoraj" },
    { email: "tomek@example.com", nickname: "TomekR", firstName: "Tomasz", lastName: "Rutkowski", city: "Biłgoraj" },
  ];

  const demoUsers: (typeof users.$inferSelect)[] = [];
  for (const u of demoUsersData) {
    const [created] = await db
      .insert(users)
      .values({ ...u, phone: "+48511" + Math.floor(100000 + Math.random() * 900000), passwordHash, role: "user", showLastNameInitial: true, ...verified })
      .returning();
    demoUsers.push(created);
  }
  const [anna, marek, kasia, piotr, tomek] = demoUsers;

  for (const u of [admin, ...demoUsers]) {
    await db.insert(userProfiles).values({ userId: u.id, avatarEmoji: u.nickname.slice(0, 2).toUpperCase(), ratingAvg: u.role === "admin" ? "0" : "4.90", ratingCount: u.role === "admin" ? 0 : 12, completedTransactions: u.role === "admin" ? 0 : 8 });
  }

  console.log("Kampania Siepomaga demo...");
  const [campaign] = await db.insert(campaigns).values({
    name: "Pomoc dla Zosi - leczenie i rehabilitacja (DEMO)",
    beneficiaryName: "Zosia (dane fikcyjne, wyłącznie do celów demonstracyjnych)",
    description:
      "To jest w pełni fikcyjna zbiórka demonstracyjna, wykorzystywana wyłącznie do zaprezentowania działania platformy LicytujDobro. Żadne środki nie są zbierane naprawdę. W wersji produkcyjnej zbiórka jest ręcznie zatwierdzana przez administratora i prowadzona przez zewnętrzną, zweryfikowaną organizację.",
    imageUrl: "/adas-iwanejko.png",
    externalUrl: "https://www.siepomaga.pl/",
    provider: "SIEPOMAGA",
    externalSlug: "demo-licytujdobro",
    piggyBankUrl: "https://www.siepomaga.pl/",
    terminalUrl: "https://www.siepomaga.pl/",
    paymentLimit: "500",
    verificationMode: "SIEPOMAGA_TERMINAL_DUAL_CONFIRMATION",
    isActive: true,
    organizerName: "Fundacja Siepomaga - konfiguracja demonstracyjna",
    verificationInfo:
      "Zbiórka jest prowadzona i weryfikowana przez wskazaną zewnętrzną organizację. LicytujDobro nie przyjmuje wpłat i nie weryfikuje dokumentacji medycznej.",
    targetAmount: "20000",
    currentAmount: "3260",
    isVisible: true,
    isDemo: true,
    updatesJson: [
      { date: new Date().toISOString(), text: "Dane demonstracyjne. Przed publikacją administrator wpisuje prawdziwy link do zbiórki, Skarbonki i Terminalu Siepomaga." },
    ],
  }).returning();

  console.log("Ogłoszenia i aukcje...");
  const day = 24 * 60 * 60 * 1000;

  type ListingSeed = {
    owner: typeof users.$inferSelect;
    title: string;
    categoryName: string;
    shortDescription: string;
    fullDescription: string;
    condition: "nowy" | "jak_nowy" | "bardzo_dobry" | "dobry" | "uzywany" | "widoczne_slady";
    knownDefects: string;
    completeness: string;
    estimatedValue: string;
    district: string;
    startPrice: string;
    durationDays: number;
    status: "AKTYWNA" | "OCZEKUJE_NA_MODERACJE" | "ZAKONCZONA" | "WYMAGA_POPRAWY";
    endInMs?: number;
    seedPhoto: string;
  };

  const seedListings: ListingSeed[] = [
    {
      owner: anna,
      title: "Książka fantasy w bardzo dobrym stanie - 'Wiedźmin: Ostatnie życzenie'",
      categoryName: "Książki",
      shortDescription: "Klasyka polskiego fantasy, twarda oprawa, bez zaznaczeń.",
      fullDescription: "Powieść czytana raz, przechowywana w suchym miejscu. Brak zaginanych rogów, grzbiet w dobrym stanie.",
      condition: "bardzo_dobry",
      knownDefects: "Delikatne przetarcie na obwolucie.",
      completeness: "Komplet, bez dedykacji.",
      estimatedValue: "35",
      district: "Biłgoraj i okolice",
      startPrice: "10",
      durationDays: 5,
      status: "AKTYWNA",
      endInMs: 45 * 60 * 1000,
      seedPhoto: "ksiazka-wiedzmin",
    },
    {
      owner: marek,
      title: "Zestaw trzech komiksów superbohaterskich",
      categoryName: "Komiksy",
      shortDescription: "Trzy zeszyty w dobrym stanie, idealne na start kolekcji.",
      fullDescription: "Zestaw obejmuje trzy różne tytuły. Strony bez zabrudzeń, okładki lekko otarte na rogach.",
      condition: "dobry",
      knownDefects: "Lekkie otarcia rogów okładek.",
      completeness: "Komplet 3 zeszytów.",
      estimatedValue: "60",
      district: "Praga-Południe",
      startPrice: "15",
      durationDays: 5,
      status: "AKTYWNA",
      endInMs: 2 * day,
      seedPhoto: "komiksy",
    },
    {
      owner: kasia,
      title: "Gra planszowa 'Osadnicy' - kompletna edycja",
      categoryName: "Gry planszowe",
      shortDescription: "Pudełko sprawdzone, komplet elementów, instrukcja w PL.",
      fullDescription: "Gra rozłożona i policzona - wszystkie elementy na miejscu. Pudełko z niewielkimi śladami użytkowania.",
      condition: "jak_nowy",
      knownDefects: "Brak istotnych wad.",
      completeness: "100% elementów, instrukcja oryginalna.",
      estimatedValue: "120",
      district: "Wola",
      startPrice: "30",
      durationDays: 7,
      status: "AKTYWNA",
      endInMs: 4 * day,
      seedPhoto: "gra-planszowa",
    },
    {
      owner: piotr,
      title: "Ręcznie wykonany plakat typograficzny 'Biłgoraj'",
      categoryName: "Plakaty",
      shortDescription: "Autorski plakat A2, druk cyfrowy na papierze matowym.",
      fullDescription: "Plakat zaprojektowany i wydrukowany samodzielnie, format A2, gotowy do oprawienia w ramę.",
      condition: "nowy",
      knownDefects: "Brak.",
      completeness: "Plakat bez ramy.",
      estimatedValue: "80",
      district: "Śródmieście",
      startPrice: "20",
      durationDays: 3,
      status: "AKTYWNA",
      endInMs: 20 * 60 * 1000,
      seedPhoto: "plakat",
    },
    {
      owner: tomek,
      title: "Puzzle 1000 elementów - Krajobraz górski",
      categoryName: "Puzzle",
      shortDescription: "Puzzle ułożone raz i starannie spakowane, komplet elementów.",
      fullDescription: "Puzzle sprawdzone element po elemencie po ułożeniu. Pudełko w dobrym stanie.",
      condition: "bardzo_dobry",
      knownDefects: "Delikatne zagniecenie pudełka.",
      completeness: "1000/1000 elementów.",
      estimatedValue: "40",
      district: "Bemowo",
      startPrice: "12",
      durationDays: 5,
      status: "AKTYWNA",
      endInMs: 3 * day,
      seedPhoto: "puzzle",
    },
    {
      owner: anna,
      title: "Obraz lokalnego artysty - akryl na płótnie 'Wisła o zmierzchu'",
      categoryName: "Obrazy",
      shortDescription: "Oryginalny obraz namalowany przez lokalnego twórcę.",
      fullDescription: "Obraz w formacie 40x50 cm, sygnowany przez autora. Idealny do salonu lub biura.",
      condition: "jak_nowy",
      knownDefects: "Brak.",
      completeness: "Obraz bez ramy.",
      estimatedValue: "150",
      district: "Żoliborz",
      startPrice: "40",
      durationDays: 7,
      status: "WYMAGA_POPRAWY",
      seedPhoto: "obraz",
    },
    {
      owner: marek,
      title: "Zestaw książek dziecięcych - bajki na dobranoc",
      categoryName: "Książki",
      shortDescription: "Pięć książeczek dla dzieci w wieku 3-7 lat.",
      fullDescription: "Kolorowe, twarde strony, bez zagięć. Idealne na prezent lub do domowej biblioteczki.",
      condition: "bardzo_dobry",
      knownDefects: "Jedna książeczka z odbarwioną okładką.",
      completeness: "Komplet 5 książeczek.",
      estimatedValue: "45",
      district: "Ursynów",
      startPrice: "10",
      durationDays: 5,
      status: "OCZEKUJE_NA_MODERACJE",
      seedPhoto: "ksiazki-dzieciece",
    },
    {
      owner: kasia,
      title: "Piłka z podpisami lokalnej drużyny amatorskiej",
      categoryName: "Drobne artykuły sportowe",
      shortDescription: "Pamiątkowa piłka z podpisami drużyny z sezonu 2023/2024.",
      fullDescription: "Piłka używana treningowo, następnie podpisana przez zawodników lokalnego klubu amatorskiego.",
      condition: "uzywany",
      knownDefects: "Widoczne ślady użytkowania na powierzchni.",
      completeness: "Kompletna piłka.",
      estimatedValue: "50",
      district: "Targówek",
      startPrice: "15",
      durationDays: 3,
      status: "ZAKONCZONA",
      seedPhoto: "pilka",
    },
  ];

  const createdListings: { id: string; ownerId: string; title: string }[] = [];

  for (const s of seedListings) {
    const [listing] = await db
      .insert(listings)
      .values({
        userId: s.owner.id,
        title: s.title,
        categoryId: cat(s.categoryName),
        shortDescription: s.shortDescription,
        fullDescription: s.fullDescription,
        condition: s.condition,
        knownDefects: s.knownDefects,
        completeness: s.completeness,
        estimatedValue: s.estimatedValue,
        city: "Biłgoraj",
        district: s.district,
        status: s.status,
        submittedAt: now,
        declarationsAcceptedAt: now,
        moderationNote: s.status === "WYMAGA_POPRAWY" ? "Proszę dodać zdjęcie w lepszej rozdzielczości oraz doprecyzować informacje o wadach." : null,
        verificationCode: s.status === "OCZEKUJE_NA_MODERACJE" ? "LD-784219" : null,
        verificationCodeExpiresAt: s.status === "OCZEKUJE_NA_MODERACJE" ? new Date(Date.now() + day) : null,
      })
      .returning();

    createdListings.push({ id: listing.id, ownerId: s.owner.id, title: s.title });

    const demoPhotoMap: Record<string, string> = {
      "ksiazka-wiedzmin": "/images/demo/book-wiedzmin.jpg",
      "komiksy": "/images/demo/comics-set.jpg",
      "gra-planszowa": "/images/demo/boardgame-osadnicy.jpg",
      "plakat": "/images/demo/poster-Biłgoraj.jpg",
      "puzzle": "/images/demo/puzzle-mountains.jpg",
      "obraz": "/images/demo/painting-vistula.jpg",
      "ksiazki-dzieciece": "/images/demo/children-books.jpg",
      "pilka": "/images/demo/signed-ball.jpg",
    };
    const photoUrl = demoPhotoMap[s.seedPhoto] ?? "/images/demo/book-wiedzmin.jpg";
    const detailUrl = s.seedPhoto === "ksiazka-wiedzmin" ? "/images/demo/book-wiedzmin-detail.jpg" : photoUrl;
    await db.insert(listingPhotos).values([
      { listingId: listing.id, url: photoUrl, kind: "ogolne", position: 0 },
      { listingId: listing.id, url: detailUrl, kind: "zblizenie", position: 1 },
      { listingId: listing.id, url: photoUrl, kind: "wady", position: 2 },
    ]);

    if (s.status === "OCZEKUJE_NA_MODERACJE") {
      await db.insert(listingVerificationPhotos).values({ listingId: listing.id, url: photoUrl });
    }

    if (s.status === "AKTYWNA" || s.status === "ZAKONCZONA") {
      const startAt = new Date(now.getTime() - 1 * day);
      const endAt = s.status === "ZAKONCZONA" ? new Date(now.getTime() - 2 * 60 * 60 * 1000) : new Date(now.getTime() + (s.endInMs ?? 3 * day));
      const [auction] = await db
        .insert(auctions)
        .values({
          listingId: listing.id,
          campaignId: campaign.id,
          startPrice: s.startPrice,
          currentPrice: s.startPrice,
          durationDays: s.durationDays,
          startAt,
          endAt,
          originalEndAt: endAt,
          status: s.status === "ZAKONCZONA" ? "ZAKONCZONA" : "AKTYWNA",
          preferredDays: "Sobota, niedziela",
          preferredHours: "10:00 - 18:00",
          meetingNotes: "Możliwość spotkania przy stacji metra.",
        })
        .returning();

      const bidders = demoUsers.filter((u) => u.id !== s.owner.id);
      let price = Number(s.startPrice);
      let bidCount = 0;
      const bidsToPlace = s.status === "ZAKONCZONA" ? 4 : Math.floor(Math.random() * 3) + 1;
      let lastBidder = bidders[0];
      for (let i = 0; i < bidsToPlace; i++) {
        const bidder = bidders[i % bidders.length];
        const increment = price < 49 ? 2 : price < 199 ? 5 : price < 499 ? 10 : 20;
        price = price + increment + Math.floor(Math.random() * 3) * increment;
        lastBidder = bidder;
        await db.insert(bids).values({
          auctionId: auction.id,
          userId: bidder.id,
          amount: String(price),
          createdAt: new Date(startAt.getTime() + (i + 1) * 60 * 60 * 1000),
          serverTime: new Date(startAt.getTime() + (i + 1) * 60 * 60 * 1000),
          auctionStateSnapshot: { seed: true },
        });
        bidCount++;
      }
      if (bidCount > 0) {
        await db
          .update(auctions)
          .set({ currentPrice: String(price), winnerId: lastBidder.id, bidCount, bidderCount: new Set(Array.from({ length: bidCount }).map((_, i) => bidders[i % bidders.length].id)).size })
          .where(eqId(auction.id));
      }

      if (s.status === "ZAKONCZONA" && bidCount > 0) {
        const [transaction] = await db
          .insert(transactions)
          .values({
            auctionId: auction.id,
            listingId: listing.id,
            winnerId: lastBidder.id,
            sellerId: s.owner.id,
            amount: String(price),
            campaignId: campaign.id,
            campaignNameSnapshot: campaign.name,
            campaignUrlSnapshot: campaign.externalUrl,
            piggyBankUrlSnapshot: campaign.piggyBankUrl,
            terminalUrlSnapshot: campaign.terminalUrl,
            campaignProviderSnapshot: campaign.provider,
            paymentMethod: "SIEPOMAGA_TERMINAL_BLIK",
            status: "ZAKONCZONA_POMYSLNIE",
            winnerConfirmDeadline: new Date(now.getTime() - 1 * day),
            winnerConfirmedAt: new Date(now.getTime() - 90 * 60 * 60 * 1000),
            donationCode: generateDonationCode(),
            buyerConfirmedPresenceAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
            sellerConfirmedPresenceAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
            buyerAcceptedItemAt: new Date(now.getTime() - 29 * 60 * 60 * 1000),
            terminalOpenedAt: new Date(now.getTime() - 29 * 60 * 60 * 1000),
            waitingForBlikAt: new Date(now.getTime() - 29 * 60 * 60 * 1000),
            buyerDonationConfirmedAt: new Date(now.getTime() - 28.5 * 60 * 60 * 1000),
            sellerDonationConfirmedAt: new Date(now.getTime() - 28.5 * 60 * 60 * 1000),
            buyerConfirmedHandoverAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
            sellerConfirmedHandoverAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
            meetingDeadline: new Date(now.getTime() + 3 * day),
          })
          .returning();

        await db.insert(meetingProposals).values([
          { transactionId: transaction.id, proposedBy: s.owner.id, date: formatDate(new Date(now.getTime() - 32 * 60 * 60 * 1000)), timeRange: "16:00 - 17:00", location: "Kawiarnia przy Dworcu Wschodnim", status: "WYBRANY" },
        ]);
        await db.insert(meetings).values({
          transactionId: transaction.id,
          date: formatDate(new Date(now.getTime() - 32 * 60 * 60 * 1000)),
          timeRange: "16:00 - 17:00",
          location: "Kawiarnia przy Dworcu Wschodnim",
          status: "ZAKONCZONE",
        });
        await db.insert(donationVerifications).values({
          transactionId: transaction.id,
          code: transaction.donationCode,
          amount: String(price),
          method: "SIEPOMAGA_TERMINAL_DUAL",
          provider: "SIEPOMAGA",
          buyerConfirmedAt: new Date(now.getTime() - 28.5 * 60 * 60 * 1000),
          sellerConfirmedAt: new Date(now.getTime() - 28.5 * 60 * 60 * 1000),
          verifiedBy: s.owner.id,
          verifiedAt: new Date(now.getTime() - 29 * 60 * 60 * 1000),
        });
        await db.insert(handoverConfirmations).values({
          transactionId: transaction.id,
          qrCode: `QR-${transaction.id.slice(0, 8)}`,
          buyerConfirmedAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
          sellerConfirmedAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
        });
        await db.insert(ratings).values([
          {
            transactionId: transaction.id,
            raterId: lastBidder.id,
            ratedId: s.owner.id,
            role: "SPRZEDAJACY",
            stars: 5,
            criteria: { zgodnosc: 5, punktualnosc: 5, komunikacja: 5, sprawnosc: 5 },
            comment: "Przedmiot dokładnie zgodny z opisem, bardzo miła osoba.",
          },
          {
            transactionId: transaction.id,
            raterId: s.owner.id,
            ratedId: lastBidder.id,
            role: "KUPUJACY",
            stars: 5,
            criteria: { punktualnosc: 5, komunikacja: 5, wplata: 5, zasady: 5 },
            comment: "Punktualny, sprawna wpłata na zbiórkę.",
          },
        ]);

        await db
          .update(userProfiles)
          .set({
            completedTransactions: 1,
            listingsCount: 1,
            ratingAvg: "5",
            ratingCount: 1,
            totalForCampaign: String(price),
            badges: ["Pierwsza aukcja", "Zaufany wystawiający"],
          })
          .where(eqUserId(s.owner.id));

        await db
          .update(userProfiles)
          .set({ completedTransactions: 1, ratingAvg: "5", ratingCount: 1, badges: ["Pierwsza wygrana", "Punktualny uczestnik"] })
          .where(eqUserId(lastBidder.id));
      }
    }
  }

  // Obserwowane aukcje demo
  const activeAuctionListing = createdListings[0];
  await db.insert(watchlists).values([{ userId: marek.id, listingId: activeAuctionListing.id }]);

  console.log("Gotowe. Zseedowano:", createdListings.length, "ogłoszeń.");
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Małe pomocnicze funkcje dla czytelności warunków `where` (unikanie dodatkowego importu w każdym miejscu).
import { eq } from "drizzle-orm";
function eqId(id: string) {
  return eq(auctions.id, id);
}
function eqUserId(id: string) {
  return eq(userProfiles.userId, id);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
