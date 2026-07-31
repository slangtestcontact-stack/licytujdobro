import { NextRequest } from "next/server";
import { db } from "@/db";
import { auctions, listings, reports, supportTeams, transactions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "brak_danych\n";
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return `${headers.map(csvCell).join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ ok: false, error: "Forbidden" }, { status: 403 }); }
  const { type } = await params;
  let rows: Record<string, unknown>[];
  if (type === "users") rows = await db.select().from(users) as unknown as Record<string, unknown>[];
  else if (type === "auctions") rows = await db.select({ listing: listings, auction: auctions }).from(listings).leftJoin(auctions, eq(auctions.listingId, listings.id)) as unknown as Record<string, unknown>[];
  else if (type === "transactions") rows = await db.select().from(transactions) as unknown as Record<string, unknown>[];
  else if (type === "reports") rows = await db.select().from(reports) as unknown as Record<string, unknown>[];
  else if (type === "teams") rows = await db.select().from(supportTeams) as unknown as Record<string, unknown>[];
  else return Response.json({ ok: false, error: "Nieznany eksport." }, { status: 404 });
  return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=licytujdobro-${type}-${new Date().toISOString().slice(0, 10)}.csv` } });
}
