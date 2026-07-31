import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { findOrCreateQuickUser, safeReturnTo } from "@/lib/quick-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get("ld_oauth_state")?.value;
  const returnTo = safeReturnTo(request.cookies.get("ld_oauth_return")?.value);
  if (!code || !state || !expected || state !== expected) return NextResponse.redirect(new URL("/logowanie?error=oauth_state", request.url));
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL("/logowanie?error=google_not_configured", request.url));
  const redirectUri = `${process.env.APP_URL || request.nextUrl.origin}/api/auth/google/callback`;
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    if (!tokenResponse.ok) throw new Error("Nie udało się pobrać tokenu Google.");
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new Error("Brak tokenu Google.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!profileResponse.ok) throw new Error("Nie udało się pobrać profilu Google.");
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.sub || !profile.email || profile.email_verified !== true) throw new Error("Google nie potwierdził adresu e-mail.");
    const user = await findOrCreateQuickUser({ provider: "google", providerAccountId: profile.sub, email: profile.email, name: profile.name });
    await createSession(user.id);
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.delete("ld_oauth_state"); response.cookies.delete("ld_oauth_return");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/logowanie?error=google_failed", request.url));
  }
}
