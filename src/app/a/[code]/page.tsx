import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { sanitizePublicCode } from "@/lib/public-code";

export const dynamic = "force-dynamic";
export default async function ShortAuctionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [listing] = await db.select({ id: listings.id }).from(listings).where(eq(listings.shortCode, sanitizePublicCode(code))).limit(1);
  if (!listing) notFound();
  redirect(`/aukcje/${listing.id}`);
}
