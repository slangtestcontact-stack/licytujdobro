import { NextRequest, NextResponse } from "next/server";
import { createAppleState } from "@/lib/apple-oauth";

export async function GET(request: NextRequest) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/logowanie?error=apple_not_configured", request.url));
  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  if (!appUrl.startsWith("https://")) return NextResponse.redirect(new URL("/logowanie?error=apple_https_required", request.url));

  const { state, nonce } = createAppleState(request.nextUrl.searchParams.get("returnTo"));
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/apple/callback`;
  const url = new URL("https://appleid.apple.com/auth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code id_token");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("scope", "name email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return NextResponse.redirect(url);
}
