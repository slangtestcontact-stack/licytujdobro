import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { findOrCreateQuickUser, safeReturnTo } from "@/lib/quick-auth";

type FacebookApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: FacebookApiError;
};

type FacebookProfileResponse = {
  id?: string;
  name?: string;
  email?: string;
  error?: FacebookApiError;
};

type FacebookPermissionsResponse = {
  data?: Array<{ permission: string; status: string }>;
  error?: FacebookApiError;
};

function redirectToLogin(
  request: NextRequest,
  error: string,
  returnTo: string,
) {
  const url = new URL("/logowanie", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("returnTo", returnTo);

  const response = NextResponse.redirect(url, 303);
  response.cookies.delete("ld_oauth_state");
  response.cookies.delete("ld_oauth_return");
  return response;
}

function getFacebookErrorMessage(error?: FacebookApiError) {
  if (!error) return "Nieznany błąd Facebook API";

  return [
    error.message,
    error.type ? `type=${error.type}` : null,
    typeof error.code === "number" ? `code=${error.code}` : null,
    typeof error.error_subcode === "number"
      ? `subcode=${error.error_subcode}`
      : null,
    error.fbtrace_id ? `trace=${error.fbtrace_id}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(
    request.cookies.get("ld_oauth_return")?.value,
  );

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    console.warn("[Facebook OAuth] Logowanie anulowane", {
      error: oauthError,
      reason: request.nextUrl.searchParams.get("error_reason"),
      description: request.nextUrl.searchParams.get("error_description"),
    });
    return redirectToLogin(request, "facebook_denied", returnTo);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("ld_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToLogin(request, "oauth_state", returnTo);
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectToLogin(request, "facebook_not_configured", returnTo);
  }

  const appUrl = (process.env.APP_URL || request.nextUrl.origin).replace(
    /\/$/,
    "",
  );
  const redirectUri = `${appUrl}/api/auth/facebook/callback`;

  try {
    const tokenUrl = new URL(
      "https://graph.facebook.com/oauth/access_token",
    );
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
    const token = (await tokenResponse.json()) as FacebookTokenResponse;

    if (!tokenResponse.ok || token.error || !token.access_token) {
      throw new Error(
        `Nie udało się pobrać tokenu Facebook: ${getFacebookErrorMessage(
          token.error,
        )}`,
      );
    }

    let emailPermissionStatus: string | undefined;
    try {
      const permissionsResponse = await fetch(
        "https://graph.facebook.com/me/permissions",
        {
          headers: { Authorization: `Bearer ${token.access_token}` },
          cache: "no-store",
        },
      );
      const permissions =
        (await permissionsResponse.json()) as FacebookPermissionsResponse;

      if (permissionsResponse.ok && !permissions.error) {
        emailPermissionStatus = permissions.data?.find(
          (item) => item.permission === "email",
        )?.status;

        if (process.env.NODE_ENV !== "production") {
          console.log("[Facebook OAuth permissions]", permissions.data);
        }
      }
    } catch (permissionsError) {
      console.warn(
        "[Facebook OAuth] Nie udało się sprawdzić uprawnień",
        permissionsError,
      );
    }

    const profileUrl = new URL("https://graph.facebook.com/me");
    profileUrl.searchParams.set("fields", "id,name,email");

    const profileResponse = await fetch(profileUrl, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    const profile =
      (await profileResponse.json()) as FacebookProfileResponse;

    if (!profileResponse.ok || profile.error) {
      throw new Error(
        `Nie udało się pobrać profilu Facebook: ${getFacebookErrorMessage(
          profile.error,
        )}`,
      );
    }
    if (!profile.id) {
      throw new Error("Facebook nie zwrócił identyfikatora użytkownika.");
    }

    const email = profile.email?.trim().toLowerCase() || null;
    const name = profile.name?.trim() || undefined;

    if (!email) {
      console.warn(
        "[Facebook OAuth] Konto zostanie utworzone bez e-maila",
        {
          facebookUserId: profile.id,
          hasName: Boolean(name),
          emailPermissionStatus:
            emailPermissionStatus ?? "brak informacji",
        },
      );
    }

    const user = await findOrCreateQuickUser({
      provider: "facebook",
      providerAccountId: profile.id,
      email,
      name,
    });

    if (user.status === "zablokowane" || user.status === "zawieszone") {
      return redirectToLogin(request, "facebook_failed", returnTo);
    }

    await createSession(user.id);

    const response = NextResponse.redirect(
      new URL(returnTo, request.url),
      303,
    );
    response.cookies.delete("ld_oauth_state");
    response.cookies.delete("ld_oauth_return");
    return response;
  } catch (error) {
    console.error("[Facebook OAuth callback]", error);
    return redirectToLogin(request, "facebook_failed", returnTo);
  }
}
