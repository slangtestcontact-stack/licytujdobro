import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { safeReturnTo } from "@/lib/quick-auth";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/logowanie?error=google_not_configured", request.url));
  const state = randomBytes(24).toString("base64url");
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const redirectUri = `${process.env.APP_URL || request.nextUrl.origin}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(url);
  response.cookies.set("ld_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  response.cookies.set("ld_oauth_return", returnTo, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return response;
}
