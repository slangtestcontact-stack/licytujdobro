import "server-only";
import { createHmac, createPrivateKey, createPublicKey, createSign, createVerify, randomBytes, timingSafeEqual } from "crypto";
import type { JsonWebKey as NodeJsonWebKey } from "node:crypto";
import { safeReturnTo } from "@/lib/quick-auth";

type StatePayload = { returnTo: string; nonce: string; exp: number };
type JwtHeader = { alg?: string; kid?: string };
type AppleClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | "true" | "false";
  nonce?: string;
};

type AppleJwk = JsonWebKey & { kid?: string; alg?: string };

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function parseBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function stateSecret() {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("OAUTH_STATE_SECRET musi mieć co najmniej 32 znaki.");
  return secret;
}

export function createAppleState(returnToValue: string | null) {
  const payload: StatePayload = {
    returnTo: safeReturnTo(returnToValue),
    nonce: randomBytes(24).toString("base64url"),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
  };
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return { state: `${body}.${signature}`, nonce: payload.nonce };
}

export function verifyAppleState(value: string | null): StatePayload | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", stateSecret()).update(body).digest();
  const provided = Buffer.from(signature, "base64url");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  const payload = parseBase64UrlJson<StatePayload>(body);
  if (!payload.nonce || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { ...payload, returnTo: safeReturnTo(payload.returnTo) };
}

function required(name: "APPLE_CLIENT_ID" | "APPLE_TEAM_ID" | "APPLE_KEY_ID" | "APPLE_PRIVATE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Brak ${name}.`);
  return value;
}

export function createAppleClientSecret() {
  const clientId = required("APPLE_CLIENT_ID");
  const teamId = required("APPLE_TEAM_ID");
  const keyId = required("APPLE_KEY_ID");
  const privateKey = required("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: teamId,
    iat: now,
    exp: now + 5 * 60,
    aud: "https://appleid.apple.com",
    sub: clientId,
  }));
  const data = `${header}.${payload}`;
  const signer = createSign("SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign({ key: createPrivateKey(privateKey), dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${data}.${signature}`;
}

export async function exchangeAppleCode(code: string, redirectUri: string) {
  const clientId = required("APPLE_CLIENT_ID");
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: createAppleClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Apple token endpoint odpowiedział ${response.status}.`);
  return response.json() as Promise<{ id_token?: string; access_token?: string; refresh_token?: string }>;
}

export async function verifyAppleIdToken(idToken: string, expectedNonce: string): Promise<AppleClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Nieprawidłowy token Apple.");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = parseBase64UrlJson<JwtHeader>(encodedHeader);
  const claims = parseBase64UrlJson<AppleClaims>(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Nieobsługiwany podpis Apple.");

  const keysResponse = await fetch("https://appleid.apple.com/auth/keys", { cache: "no-store" });
  if (!keysResponse.ok) throw new Error("Nie udało się pobrać kluczy Apple.");
  const keySet = await keysResponse.json() as { keys?: AppleJwk[] };
  const jwk = keySet.keys?.find((item) => item.kid === header.kid);
  if (!jwk) throw new Error("Nie znaleziono właściwego klucza Apple.");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const valid = verifier.verify(createPublicKey({ key: jwk as unknown as NodeJsonWebKey, format: "jwk" }), Buffer.from(encodedSignature, "base64url"));
  if (!valid) throw new Error("Nieprawidłowy podpis tokenu Apple.");

  const clientId = required("APPLE_CLIENT_ID");
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== "https://appleid.apple.com" || !audience.includes(clientId)) throw new Error("Nieprawidłowy wystawca tokenu Apple.");
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) throw new Error("Token Apple wygasł.");
  if (!claims.sub || !claims.email || claims.nonce !== expectedNonce) throw new Error("Token Apple nie zawiera wymaganych danych.");
  if (!(claims.email_verified === true || claims.email_verified === "true")) throw new Error("Apple nie potwierdził adresu e-mail.");
  return claims;
}
