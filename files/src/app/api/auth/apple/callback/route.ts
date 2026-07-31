import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { exchangeAppleCode, verifyAppleIdToken, verifyAppleState } from "@/lib/apple-oauth";
import { findOrCreateQuickUser } from "@/lib/quick-auth";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const error = String(form.get("error") || "");
    if (error) return NextResponse.redirect(new URL("/logowanie?error=apple_failed", request.url), 303);

    const code = String(form.get("code") || "");
    const state = verifyAppleState(String(form.get("state") || ""));
    const responseIdToken = String(form.get("id_token") || "");
    if (!code || !state || !responseIdToken) return NextResponse.redirect(new URL("/logowanie?error=oauth_state", request.url), 303);

    const appUrl = (process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
    const redirectUri = `${appUrl}/api/auth/apple/callback`;
    const tokenResponse = await exchangeAppleCode(code, redirectUri);
    const idToken = tokenResponse.id_token || responseIdToken;
    const claims = await verifyAppleIdToken(idToken, state.nonce);

    let name = "";
    const rawUser = form.get("user");
    if (typeof rawUser === "string" && rawUser.length < 5000) {
      try {
        const user = JSON.parse(rawUser) as { name?: { firstName?: string; lastName?: string } };
        name = [user.name?.firstName, user.name?.lastName].filter(Boolean).join(" ");
      } catch { /* Apple przekazuje pole user tylko przy pierwszym logowaniu. */ }
    }

    const user = await findOrCreateQuickUser({
      provider: "apple",
      providerAccountId: claims.sub!,
      email: claims.email!,
      name,
    });
    await createSession(user.id);
    return NextResponse.redirect(new URL(state.returnTo, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/logowanie?error=apple_failed", request.url), 303);
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/logowanie?error=apple_failed", request.url));
}
