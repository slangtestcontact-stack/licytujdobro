import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guestAuctionReminders } from "@/db/schema";

function page(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f7f2e8;color:#12372f;font-family:Arial,sans-serif"><main style="max-width:560px;margin:64px auto;padding:28px;background:white;border:1px solid #dbe4df;border-radius:16px"><p style="font-weight:800;color:#0d493d">LicytujDobro</p><h1 style="font-size:26px">${title}</h1><p style="line-height:1.6">${body}</p><a href="/aukcje" style="display:inline-block;margin-top:12px;padding:12px 18px;border-radius:10px;background:#0d493d;color:white;text-decoration:none;font-weight:700">Zobacz aukcje dla Adasia</a></main></body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{60}$/i.test(token)) return page("Nieprawidłowy link", "Link rezygnacji jest nieprawidłowy lub wygasł.", 400);
  const [reminder] = await db.select({ id: guestAuctionReminders.id }).from(guestAuctionReminders).where(eq(guestAuctionReminders.unsubscribeToken, token)).limit(1);
  if (!reminder) return page("Przypomnienie nie istnieje", "To przypomnienie zostało już usunięte albo link jest nieaktualny.", 404);
  await db.delete(guestAuctionReminders).where(eq(guestAuctionReminders.id, reminder.id));
  return page("Przypomnienie wyłączone", "Nie wyślemy wiadomości dotyczącej tej aukcji. Rekord z adresem został usunięty i nie był zapisem do newslettera.");
}
