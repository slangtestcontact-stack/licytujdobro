import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { safeReturnTo } from "@/lib/quick-auth";

export async function GET(request: NextRequest) {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/logowanie?error=facebook_not_configured", request.url),
    );
  }

  const state = randomBytes(24).toString("base64url");
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const appUrl = (process.env.APP_URL || request.nextUrl.origin).replace(
    /\/$/,
    "",
  );
  const redirectUri = `${appUrl}/api/auth/facebook/callback`;

  const url = new URL("https://www.facebook.com/dialog/oauth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "email,public_profile");
  url.searchParams.set("auth_type", "rerequest");

  const response = NextResponse.redirect(url);
  response.cookies.set("ld_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  response.cookies.set("ld_oauth_return", returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
