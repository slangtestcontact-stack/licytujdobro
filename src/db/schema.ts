import {
  pgTable,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

// ---------- ENUMS ----------
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const accountStatusEnum = pgEnum("account_status", [
  "nowe",
  "aktywne",
  "zawieszone",
  "zablokowane",
]);
export const listingStatusEnum = pgEnum("listing_status", [
  "SZKIC",
  "OCZEKUJE_NA_MODERACJE",
  "WYMAGA_POPRAWY",
  "ZATWIERDZONA",
  "AKTYWNA",
  "ZAKONCZONA",
  "ANULOWANA_PRZED_LICYTACJA",
  "ANULOWANA_PRZEZ_ADMINISTRATORA",
]);
export const conditionEnum = pgEnum("item_condition", [
  "nowy",
  "jak_nowy",
  "bardzo_dobry",
  "dobry",
  "uzywany",
  "widoczne_slady",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY",
  "UMAWIANIE_SPOTKANIA",
  "SPOTKANIE_ZAPLANOWANE",
  "OBIE_STRONY_NA_MIEJSCU",
  "OGLEDZINY",
  "PRZEDMIOT_ZAAKCEPTOWANY",
  "OCZEKIWANIE_NA_OTWARCIE_TERMINALU",
  "TERMINAL_OTWARTY",
  "OCZEKIWANIE_NA_BLIK",
  "WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO",
  "WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO",
  "WPLATA_POTWIERDZONA_OBUSTRONNIE",
  "WPLATA_NIEUDANA",
  "WPLATA_WYMAGA_WYJASNIENIA",
  "OCZEKUJE_NA_PLATNOSC",
  "PLATNOSC_ODLOZONA",
  "OCZEKUJE_NA_WERYFIKACJE",
  "WPLATA_POTWIERDZONA",
  "PONOWNY_ODBIOR_WYMAGANY",
  "PROBLEM_Z_PLATNOSCIA",
  // Statusy pozostawione dla zgodności ze starszymi danymi demo.
  "OCZEKIWANIE_NA_WPLATE",
  "WPLATA_ZWERYFIKOWANA",
  "PRZEDMIOT_PRZEKAZANY",
  "ZAKONCZONA_POMYSLNIE",
  "ZWYCIEZCA_NIE_POTWIERDZIL",
  "NIEOBECNOSC_KUPUJACEGO",
  "NIEOBECNOSC_WYSTAWIAJACEGO",
  "PRZEDMIOT_NIEZGODNY_Z_OPISEM",
  "WPLATA_NIEPOTWIERDZONA",
  "ODMOWA_PRZEKAZANIA",
  "SPOR",
  "ANULOWANA",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "AUKCJA_ZATWIERDZONA",
  "AUKCJA_ODRZUCONA",
  "PROSBA_O_POPRAWE",
  "NOWA_OFERTA",
  "PRZEBITY",
  "KONCZY_SIE_24H",
  "KONCZY_SIE_1H",
  "PRZEDLUZONA",
  "WYGRANA",
  "PRZEGRANA",
  "POTWIERDZ_UDZIAL",
  "NOWA_PROPOZYCJA_SPOTKANIA",
  "SPOTKANIE_24H",
  "SPOTKANIE_1H",
  "WPLATA_OCZEKUJE",
  "PRZEDMIOT_PRZEKAZANY",
  "PROSBA_O_OCENE",
  "NOWE_ZGLOSZENIE",
  "DECYZJA_ADMINA",
  "INFO",
]);

// ---------- USERS ----------
export const users = pgTable("users", {
  id: id(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }),
  showLastNameInitial: boolean("show_last_name_initial").notNull().default(false),
  nickname: varchar("nickname", { length: 60 }).notNull().unique(),
  city: varchar("city", { length: 120 }).notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  status: accountStatusEnum("status").notNull().default("nowe"),
  isAdultConfirmed: boolean("is_adult_confirmed").notNull().default(false),
  acceptedTermsAt: timestamp("accepted_terms_at", { withTimezone: true }),
  acceptedPrivacyAt: timestamp("accepted_privacy_at", { withTimezone: true }),
  acceptedBiddingRulesAt: timestamp("accepted_bidding_rules_at", { withTimezone: true }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  registrationIp: varchar("registration_ip", { length: 64 }),
  lastLoginIp: varchar("last_login_ip", { length: 64 }),
  biddingSuspendedUntil: timestamp("bidding_suspended_until", { withTimezone: true }),
  identityVerifiedAt: timestamp("identity_verified_at", { withTimezone: true }),
  trustedSellerAt: timestamp("trusted_seller_at", { withTimezone: true }),
  localPartnerAt: timestamp("local_partner_at", { withTimezone: true }),
  volunteerAt: timestamp("volunteer_at", { withTimezone: true }),
  authProvider: varchar("auth_provider", { length: 30 }).notNull().default("password"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  biddingTermsVersion: varchar("bidding_terms_version", { length: 30 }),
  biddingTermsAcceptedAt: timestamp("bidding_terms_accepted_at", { withTimezone: true }),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_created_idx").on(table.userId, table.createdAt),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const userProfiles = pgTable("user_profiles", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  bio: text("bio"),
  avatarEmoji: varchar("avatar_emoji", { length: 8 }).default("LD"),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
  ratingCount: integer("rating_count").notNull().default(0),
  completedTransactions: integer("completed_transactions").notNull().default(0),
  listingsCount: integer("listings_count").notNull().default(0),
  totalForCampaign: numeric("total_for_campaign", { precision: 10, scale: 2 }).notNull().default("0"),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
  publicRegion: varchar("public_region", { length: 120 }).default("Biłgoraj i okolice"),
  ...timestamps,
});

export const userVerifications = pgTable("user_verifications", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  emailToken: text("email_token").unique(),
  emailTokenExpiresAt: timestamp("email_token_expires_at", { withTimezone: true }),
  phoneCode: varchar("phone_code", { length: 12 }),
  phoneCodeExpiresAt: timestamp("phone_code_expires_at", { withTimezone: true }),
  phoneAttempts: integer("phone_attempts").notNull().default(0),
  passwordResetToken: text("password_reset_token").unique(),
  passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
  ...timestamps,
});

export const userPenalties = pgTable("user_penalties", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 80 }).notNull(),
  reason: text("reason").notNull(),
  issuedBy: text("issued_by").references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
});

// ---------- CAMPAIGN ----------
export const campaigns = pgTable("campaigns", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  beneficiaryName: varchar("beneficiary_name", { length: 200 }),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  externalUrl: text("external_url").notNull(),
  provider: varchar("provider", { length: 40 }).notNull().default("SIEPOMAGA"),
  externalSlug: varchar("external_slug", { length: 180 }),
  piggyBankUrl: text("piggy_bank_url"),
  terminalUrl: text("terminal_url"),
  paymentLimit: numeric("payment_limit", { precision: 10, scale: 2 }).notNull().default("500"),
  verificationMode: varchar("verification_mode", { length: 80 }).notNull().default("SIEPOMAGA_TERMINAL_DUAL_CONFIRMATION"),
  isActive: boolean("is_active").notNull().default(true),
  organizerName: varchar("organizer_name", { length: 200 }).notNull(),
  verificationInfo: text("verification_info").notNull(),
  targetAmount: numeric("target_amount", { precision: 10, scale: 2 }),
  currentAmount: numeric("current_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  isVisible: boolean("is_visible").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  terminalTestedAt: timestamp("terminal_tested_at", { withTimezone: true }),
  terminalTestedBy: text("terminal_tested_by").references(() => users.id),
  terminalTestResult: varchar("terminal_test_result", { length: 30 }),
  terminalTestNote: text("terminal_test_note"),
  updatesJson: jsonb("updates_json").$type<{ date: string; text: string }[]>().notNull().default([]),
  ...timestamps,
});

// ---------- CATEGORIES ----------
export const categories = pgTable("categories", {
  id: id(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  isAllowed: boolean("is_allowed").notNull().default(true),
  maxValue: numeric("max_value", { precision: 10, scale: 2 }),
  ...timestamps,
});

// ---------- LISTINGS ----------
export const listings = pgTable("listings", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 160 }).notNull(),
  shortCode: varchar("short_code", { length: 18 }).unique(),
  categoryId: text("category_id").notNull().references(() => categories.id),
  shortDescription: varchar("short_description", { length: 240 }).notNull(),
  fullDescription: text("full_description").notNull(),
  condition: conditionEnum("condition").notNull(),
  knownDefects: text("known_defects").notNull().default(""),
  completeness: text("completeness").notNull().default(""),
  estimatedValue: numeric("estimated_value", { precision: 10, scale: 2 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  district: varchar("district", { length: 120 }).notNull(),
  status: listingStatusEnum("status").notNull().default("SZKIC"),
  moderationNote: text("moderation_note"),
  verificationCode: varchar("verification_code", { length: 20 }),
  verificationCodeExpiresAt: timestamp("verification_code_expires_at", { withTimezone: true }),
  declarationsAcceptedAt: timestamp("declarations_accepted_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  qualityScore: integer("quality_score").notNull().default(0),
  isSpecial: boolean("is_special").notNull().default(false),
  specialLabel: varchar("special_label", { length: 80 }),
  autosavedAt: timestamp("autosaved_at", { withTimezone: true }),
  ownerType: varchar("owner_type", { length: 30 }).notNull().default("SELF"),
  thirdPartyOwnerName: varchar("third_party_owner_name", { length: 160 }),
  thirdPartyOwnerPhone: varchar("third_party_owner_phone", { length: 32 }),
  ownerConsentAt: timestamp("owner_consent_at", { withTimezone: true }),
  handoverResponsibleName: varchar("handover_responsible_name", { length: 160 }),
  ownerDescriptionResponsibilityAcceptedAt: timestamp("owner_description_responsibility_accepted_at", { withTimezone: true }),
  moderationChecklist: jsonb("moderation_checklist").$type<Record<string, boolean>>().notNull().default({}),
  ...timestamps,
});

export const listingPhotos = pgTable(
  "listing_photos",
  {
    id: id(),
    listingId: text("listing_id").notNull().references(() => listings.id),
    url: text("url").notNull(),
    kind: varchar("kind", { length: 30 }).notNull(), // ogolne | zblizenie | wady | inne
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("listing_photos_listing_kind_position_idx").on(
      table.listingId,
      table.kind,
      table.position,
    ),
  ],
);

export const listingVerificationPhotos = pgTable("listing_verification_photos", {
  id: id(),
  listingId: text("listing_id").notNull().references(() => listings.id),
  url: text("url").notNull(),
  ...timestamps,
});

// ---------- AUCTIONS ----------
export const auctions = pgTable(
  "auctions",
  {
    id: id(),
    listingId: text("listing_id").notNull().unique().references(() => listings.id),
    campaignId: text("campaign_id").references(() => campaigns.id),
    mode: varchar("mode", { length: 40 }).notNull().default("FIXED_DONATION"),
    startPrice: numeric("start_price", { precision: 10, scale: 2 }).notNull(),
    minBidIncrement: numeric("min_bid_increment", { precision: 10, scale: 2 }).notNull().default("5"),
    interestDeadline: timestamp("interest_deadline", { withTimezone: true }),
    interestDurationHours: integer("interest_duration_hours").notNull().default(48),
    auctionDurationHours: integer("auction_duration_hours").notNull().default(24),
    currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
    durationDays: integer("duration_days").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    originalEndAt: timestamp("original_end_at", { withTimezone: true }),
    totalExtensionSeconds: integer("total_extension_seconds").notNull().default(0),
    status: varchar("status", { length: 30 }).notNull().default("ZATWIERDZONA"), // ZATWIERDZONA | AKTYWNA | ZAKONCZONA | ANULOWANA
    winnerId: text("winner_id").references(() => users.id),
    bidCount: integer("bid_count").notNull().default(0),
    bidderCount: integer("bidder_count").notNull().default(0),
    preferredDays: text("preferred_days"),
    preferredHours: text("preferred_hours"),
    meetingNotes: text("meeting_notes"),
    lockVersion: integer("lock_version").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("auctions_status_idx").on(table.status), index("auctions_end_at_idx").on(table.endAt)],
);

export const listingInterests = pgTable(
  "listing_interests",
  {
    id: id(),
    listingId: text("listing_id").notNull().references(() => listings.id),
    auctionId: text("auction_id").notNull().references(() => auctions.id),
    userId: text("user_id").notNull().references(() => users.id),
    status: varchar("status", { length: 30 }).notNull().default("ACTIVE"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("listing_interests_auction_user_unique").on(table.auctionId, table.userId),
    index("listing_interests_listing_idx").on(table.listingId),
    index("listing_interests_auction_status_idx").on(table.auctionId, table.status),
  ],
);

export const bids = pgTable(
  "bids",
  {
    id: id(),
    auctionId: text("auction_id").notNull().references(() => auctions.id),
    userId: text("user_id").notNull().references(() => users.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    serverTime: timestamp("server_time", { withTimezone: true }).notNull().defaultNow(),
    auctionStateSnapshot: jsonb("auction_state_snapshot").$type<Record<string, unknown>>().notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 100 }),
    isCancelled: boolean("is_cancelled").notNull().default(false),
    cancelledReason: text("cancelled_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bids_auction_idx").on(table.auctionId),
    uniqueIndex("bids_idempotency_unique").on(table.auctionId, table.userId, table.idempotencyKey),
  ],
);

export const auctionExtensions = pgTable("auction_extensions", {
  id: id(),
  auctionId: text("auction_id").notNull().references(() => auctions.id),
  extendedBySeconds: integer("extended_by_seconds").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const guestAuctionReminders = pgTable(
  "guest_auction_reminders",
  {
    id: id(),
    listingId: text("listing_id").notNull().references(() => listings.id),
    email: varchar("email", { length: 255 }).notNull(),
    unsubscribeToken: varchar("unsubscribe_token", { length: 80 }).notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("guest_auction_reminders_listing_email_unique").on(table.listingId, table.email),
    index("guest_auction_reminders_listing_idx").on(table.listingId),
  ],
);

export const watchlists = pgTable(
  "watchlists",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    listingId: text("listing_id").notNull().references(() => listings.id),
    notifyNewBid: boolean("notify_new_bid").notNull().default(true),
    notify24h: boolean("notify_24h").notNull().default(true),
    notify1h: boolean("notify_1h").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("watchlists_user_idx").on(table.userId),
    uniqueIndex("watchlists_user_listing_unique").on(table.userId, table.listingId),
  ],
);

// ---------- TRANSACTIONS ----------
export const transactions = pgTable("transactions", {
  id: id(),
  auctionId: text("auction_id").notNull().unique().references(() => auctions.id),
  listingId: text("listing_id").notNull().references(() => listings.id),
  winnerId: text("winner_id").notNull().references(() => users.id),
  sellerId: text("seller_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  plannedDonationAmount: numeric("planned_donation_amount", { precision: 10, scale: 2 }),
  campaignId: text("campaign_id").references(() => campaigns.id),
  campaignNameSnapshot: varchar("campaign_name_snapshot", { length: 200 }),
  campaignUrlSnapshot: text("campaign_url_snapshot"),
  piggyBankUrlSnapshot: text("piggy_bank_url_snapshot"),
  terminalUrlSnapshot: text("terminal_url_snapshot"),
  campaignProviderSnapshot: varchar("campaign_provider_snapshot", { length: 40 }).notNull().default("SIEPOMAGA"),
  paymentMethod: varchar("payment_method", { length: 60 }).notNull().default("SIEPOMAGA_TERMINAL_BLIK"),
  paymentFlow: varchar("payment_flow", { length: 60 }).notNull().default("UNSELECTED"),
  paymentDeferredUntil: timestamp("payment_deferred_until", { withTimezone: true }),
  paymentProblemType: varchar("payment_problem_type", { length: 80 }),
  paymentProblemNote: text("payment_problem_note"),
  adminPaymentVerifiedAt: timestamp("admin_payment_verified_at", { withTimezone: true }),
  status: transactionStatusEnum("status").notNull().default("OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY"),
  winnerConfirmDeadline: timestamp("winner_confirm_deadline", { withTimezone: true }).notNull(),
  winnerConfirmedAt: timestamp("winner_confirmed_at", { withTimezone: true }),
  donationCode: varchar("donation_code", { length: 20 }).notNull(),
  terminalOpenedAt: timestamp("terminal_opened_at", { withTimezone: true }),
  waitingForBlikAt: timestamp("waiting_for_blik_at", { withTimezone: true }),
  buyerDonationConfirmedAt: timestamp("buyer_donation_confirmed_at", { withTimezone: true }),
  sellerDonationConfirmedAt: timestamp("seller_donation_confirmed_at", { withTimezone: true }),
  donationFailureReason: text("donation_failure_reason"),
  qrCode: varchar("qr_code", { length: 40 }), // pole zgodności ze starszą wersją; nowe kody nie są tu zapisywane
  handoverCodeHash: varchar("handover_code_hash", { length: 128 }),
  handoverCodeExpiresAt: timestamp("handover_code_expires_at", { withTimezone: true }),
  handoverCodeUsedAt: timestamp("handover_code_used_at", { withTimezone: true }),
  buyerConfirmedPresenceAt: timestamp("buyer_confirmed_presence_at", { withTimezone: true }),
  sellerConfirmedPresenceAt: timestamp("seller_confirmed_presence_at", { withTimezone: true }),
  buyerAcceptedItemAt: timestamp("buyer_accepted_item_at", { withTimezone: true }),
  itemRejectedAt: timestamp("item_rejected_at", { withTimezone: true }),
  rejectionReason: varchar("rejection_reason", { length: 60 }),
  rejectionComment: text("rejection_comment"),
  rejectionPhotoUrl: text("rejection_photo_url"),
  buyerConfirmedHandoverAt: timestamp("buyer_confirmed_handover_at", { withTimezone: true }),
  sellerConfirmedHandoverAt: timestamp("seller_confirmed_handover_at", { withTimezone: true }),
  meetingDeadline: timestamp("meeting_deadline", { withTimezone: true }),
  ...timestamps,
});

export const transactionMessages = pgTable(
  "transaction_messages",
  {
    id: id(),
    transactionId: text("transaction_id").notNull().references(() => transactions.id),
    senderId: text("sender_id").notNull().references(() => users.id),
    recipientId: text("recipient_id").notNull().references(() => users.id),
    body: varchar("body", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transaction_messages_transaction_created_idx").on(table.transactionId, table.createdAt),
    index("transaction_messages_recipient_created_idx").on(table.recipientId, table.createdAt),
  ],
);

export const meetingProposals = pgTable("meeting_proposals", {
  id: id(),
  transactionId: text("transaction_id").notNull().references(() => transactions.id),
  proposedBy: text("proposed_by").notNull().references(() => users.id),
  date: varchar("date", { length: 20 }).notNull(),
  timeRange: varchar("time_range", { length: 40 }).notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  message: text("message"),
  status: varchar("status", { length: 20 }).notNull().default("PROPONOWANY"), // PROPONOWANY | WYBRANY | ODRZUCONY
  ...timestamps,
});

export const meetings = pgTable("meetings", {
  id: id(),
  transactionId: text("transaction_id").notNull().unique().references(() => transactions.id),
  chosenProposalId: text("chosen_proposal_id").references(() => meetingProposals.id),
  date: varchar("date", { length: 20 }).notNull(),
  timeRange: varchar("time_range", { length: 40 }).notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("ZAPLANOWANE"),
  ...timestamps,
});

export const donationVerifications = pgTable("donation_verifications", {
  id: id(),
  transactionId: text("transaction_id").notNull().unique().references(() => transactions.id),
  code: varchar("code", { length: 20 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 60 }).notNull().default("SIEPOMAGA_TERMINAL_DUAL"),
  provider: varchar("provider", { length: 40 }).notNull().default("SIEPOMAGA"),
  buyerConfirmedAt: timestamp("buyer_confirmed_at", { withTimezone: true }),
  sellerConfirmedAt: timestamp("seller_confirmed_at", { withTimezone: true }),
  externalReference: varchar("external_reference", { length: 160 }),
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
});

export const handoverConfirmations = pgTable("handover_confirmations", {
  id: id(),
  transactionId: text("transaction_id").notNull().unique().references(() => transactions.id),
  qrCode: varchar("qr_code", { length: 40 }), // pole zgodności ze starszymi danymi
  codeHash: varchar("code_hash", { length: 128 }),
  codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
  codeUsedAt: timestamp("code_used_at", { withTimezone: true }),
  buyerConfirmedAt: timestamp("buyer_confirmed_at", { withTimezone: true }),
  sellerConfirmedAt: timestamp("seller_confirmed_at", { withTimezone: true }),
  ...timestamps,
});

// ---------- RATINGS ----------
export const ratings = pgTable(
  "ratings",
  {
  id: id(),
  transactionId: text("transaction_id").notNull().references(() => transactions.id),
  raterId: text("rater_id").notNull().references(() => users.id),
  ratedId: text("rated_id").notNull().references(() => users.id),
  role: varchar("role", { length: 20 }).notNull(), // SPRZEDAJACY | KUPUJACY
  stars: integer("stars").notNull(),
  criteria: jsonb("criteria").$type<Record<string, number>>().notNull().default({}),
  comment: text("comment"),
  isApproved: boolean("is_approved").notNull().default(true),
  ...timestamps,
  },
  (table) => [uniqueIndex("ratings_transaction_rater_unique").on(table.transactionId, table.raterId)],
);

// ---------- REPORTS / DISPUTES ----------
export const reports = pgTable("reports", {
  id: id(),
  reporterId: text("reporter_id").notNull().references(() => users.id),
  targetType: varchar("target_type", { length: 30 }).notNull(), // LISTING | USER | BID | TRANSACTION
  targetId: text("target_id").notNull(),
  reason: varchar("reason", { length: 80 }).notNull(),
  comment: text("comment"),
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 20 }).notNull().default("NOWE"), // NOWE | W_TOKU | ZAMKNIETE
  ...timestamps,
});

export const disputes = pgTable("disputes", {
  id: id(),
  transactionId: text("transaction_id").notNull().references(() => transactions.id),
  reportId: text("report_id").references(() => reports.id),
  status: varchar("status", { length: 20 }).notNull().default("OTWARTY"), // OTWARTY | W_TOKU | ZAMKNIETY
  resolution: text("resolution"),
  adminId: text("admin_id").references(() => users.id),
  ...timestamps,
});

// ---------- V0.9: TIMELINE / PREFERENCES / ANALYTICS ----------
export const transactionEvents = pgTable(
  "transaction_events",
  {
    id: id(),
    transactionId: text("transaction_id").notNull().references(() => transactions.id),
    actorId: text("actor_id").references(() => users.id),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    details: text("details"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("transaction_events_transaction_idx").on(table.transactionId, table.createdAt)],
);

export const notificationPreferences = pgTable("notification_preferences", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  inAppAuctions: boolean("in_app_auctions").notNull().default(true),
  inAppTransactions: boolean("in_app_transactions").notNull().default(true),
  emailAuctions: boolean("email_auctions").notNull().default(true),
  emailTransactions: boolean("email_transactions").notNull().default(true),
  pushEnabled: boolean("push_enabled").notNull().default(false),
  smsCriticalOnly: boolean("sms_critical_only").notNull().default(false),
  ...timestamps,
});

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: id(),
    userId: text("user_id").references(() => users.id),
    listingId: text("listing_id").references(() => listings.id),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    source: varchar("source", { length: 60 }).notNull().default("direct"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("analytics_events_type_idx").on(table.eventType, table.createdAt)],
);

// ---------- MODERATION / AUDIT ----------
export const moderationActions = pgTable("moderation_actions", {
  id: id(),
  adminId: text("admin_id").notNull().references(() => users.id),
  listingId: text("listing_id").references(() => listings.id),
  userId: text("user_id").references(() => users.id),
  action: varchar("action", { length: 60 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    actorId: text("actor_id"),
    actorType: varchar("actor_type", { length: 20 }).notNull().default("USER"), // USER | ADMIN | SYSTEM
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_entity_idx").on(table.entityType, table.entityId)],
);

// ---------- NOTIFICATIONS ----------
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    relatedEntityType: varchar("related_entity_type", { length: 40 }),
    relatedEntityId: text("related_entity_id"),
    dedupeKey: varchar("dedupe_key", { length: 180 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    uniqueIndex("notifications_dedupe_unique").on(table.dedupeKey),
  ],
);



// ---------- COMMUNITY GROWTH ----------
export const categoryInterests = pgTable(
  "category_interests",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    categoryId: text("category_id").notNull().references(() => categories.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("category_interests_user_category_unique").on(table.userId, table.categoryId)],
);

export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: id(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 120 }),
  source: varchar("source", { length: 80 }).notNull().default("website"),
  isActive: boolean("is_active").notNull().default(true),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportTeams = pgTable("support_teams", {
  id: id(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  joinCode: varchar("join_code", { length: 32 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: id(),
    teamId: text("team_id").notNull().references(() => supportTeams.id),
    userId: text("user_id").notNull().references(() => users.id),
    role: varchar("role", { length: 30 }).notNull().default("MEMBER"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("team_memberships_user_unique").on(table.userId),
    index("team_memberships_team_idx").on(table.teamId),
  ],
);

export const campaignUpdates = pgTable("campaign_updates", {
  id: id(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

export const communityEvents = pgTable("community_events", {
  id: id(),
  slug: varchar("slug", { length: 120 }).unique(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  kind: varchar("kind", { length: 40 }).notNull().default("THEME_WEEK"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  ...timestamps,
});

export const shareEvents = pgTable(
  "share_events",
  {
    id: id(),
    listingId: text("listing_id").notNull().references(() => listings.id),
    userId: text("user_id").references(() => users.id),
    channel: varchar("channel", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("share_events_listing_idx").on(table.listingId)],
);

// ---------- ADMIN SETTINGS ----------
export const adminSettings = pgTable("admin_settings", {
  id: id(),
  key: varchar("key", { length: 80 }).notNull().unique(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventListings = pgTable(
  "event_listings",
  {
    id: id(),
    eventId: text("event_id").notNull().references(() => communityEvents.id),
    listingId: text("listing_id").notNull().references(() => listings.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("event_listings_unique").on(table.eventId, table.listingId)],
);



// ---------- V1.0: QUICK AUTH / READINESS / OPERATIONS ----------
export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    provider: varchar("provider", { length: 30 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    emailAtProvider: varchar("email_at_provider", { length: 255 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("social_accounts_provider_account_unique").on(table.provider, table.providerAccountId),
    index("social_accounts_user_idx").on(table.userId),
  ],
);

export const emailLoginCodes = pgTable(
  "email_login_codes",
  {
    id: id(),
    email: varchar("email", { length: 255 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    returnTo: text("return_to"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("email_login_codes_email_idx").on(table.email, table.createdAt)],
);

export const meetingReadiness = pgTable(
  "meeting_readiness",
  {
    id: id(),
    transactionId: text("transaction_id").notNull().references(() => transactions.id),
    userId: text("user_id").notNull().references(() => users.id),
    phoneCharged: boolean("phone_charged").notNull().default(false),
    internetAvailable: boolean("internet_available").notNull().default(false),
    paymentAvailable: boolean("payment_available").notNull().default(false),
    exactAmountKnown: boolean("exact_amount_known").notNull().default(false),
    publicPlaceConfirmed: boolean("public_place_confirmed").notNull().default(false),
    itemPrepared: boolean("item_prepared").notNull().default(false),
    preferredPayment: varchar("preferred_payment", { length: 40 }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("meeting_readiness_transaction_user_unique").on(table.transactionId, table.userId)],
);

export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: id(),
    userId: text("user_id").references(() => users.id),
    channel: varchar("channel", { length: 20 }).notNull(),
    template: varchar("template", { length: 80 }).notNull(),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 200 }),
    body: text("body").notNull(),
    actionUrl: text("action_url"),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    dedupeKey: varchar("dedupe_key", { length: 180 }).unique(),
    ...timestamps,
  },
  (table) => [index("notification_outbox_status_idx").on(table.status, table.nextAttemptAt)],
);

export const transactionCancellations = pgTable("transaction_cancellations", {
  id: id(),
  transactionId: text("transaction_id").references(() => transactions.id),
  listingId: text("listing_id").references(() => listings.id),
  requestedBy: text("requested_by").references(() => users.id),
  reason: varchar("reason", { length: 80 }).notNull(),
  details: text("details"),
  adminAction: varchar("admin_action", { length: 60 }),
  adminId: text("admin_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  ...timestamps,
});

export const backupRuns = pgTable("backup_runs", {
  id: id(),
  kind: varchar("kind", { length: 30 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  storageLocation: text("storage_location"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  restoreTestedAt: timestamp("restore_tested_at", { withTimezone: true }),
  note: text("note"),
  ...timestamps,
});

export const pilotFeedback = pgTable("pilot_feedback", {
  id: id(),
  transactionId: text("transaction_id").references(() => transactions.id),
  userId: text("user_id").references(() => users.id),
  unclear: text("unclear").notNull(),
  tooSlow: text("too_slow").notNull(),
  missing: text("missing").notNull(),
  ...timestamps,
});

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("NEW"),
  ...timestamps,
});

// ---------- PRODUCTION OPERATIONS ----------
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: varchar("key", { length: 220 }).primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rate_limit_buckets_reset_idx").on(table.resetAt)],
);

export const operationalErrors = pgTable(
  "operational_errors",
  {
    id: id(),
    source: varchar("source", { length: 120 }).notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    entityType: varchar("entity_type", { length: 60 }),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    lastOccurredAt: timestamp("last_occurred_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("operational_errors_unresolved_idx").on(table.resolvedAt, table.lastOccurredAt),
    index("operational_errors_source_idx").on(table.source, table.lastOccurredAt),
  ],
);
