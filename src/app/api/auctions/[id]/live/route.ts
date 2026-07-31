import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auctions } from "@/db/schema";
import { getRequiredBid } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [auction] = await db
    .select({
      status: auctions.status,
      currentPrice: auctions.currentPrice,
      startPrice: auctions.startPrice,
      minBidIncrement: auctions.minBidIncrement,
      bidCount: auctions.bidCount,
      endAt: auctions.endAt,
      lockVersion: auctions.lockVersion,
    })
    .from(auctions)
    .where(eq(auctions.id, id))
    .limit(1);

  if (!auction) {
    return Response.json({ ok: false, error: "Nie znaleziono aukcji." }, { status: 404 });
  }

  const currentPrice = Number(auction.currentPrice);
  return Response.json(
    {
      ok: true,
      status: auction.status,
      currentPrice,
      bidCount: auction.bidCount,
      minNextBid: getRequiredBid(
        Number(auction.startPrice),
        currentPrice,
        auction.bidCount,
        Number(auction.minBidIncrement),
      ),
      endAt: auction.endAt?.toISOString() ?? null,
      lockVersion: auction.lockVersion,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
