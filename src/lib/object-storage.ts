import "server-only";

import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredObject = {
  body: ArrayBuffer;
  contentType: string;
};

type StorageConfig = {
  driver: "local" | "r2";
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBucket?: string;
  privateBucket?: string;
  publicUrl?: string;
};

function config(): StorageConfig {
  const driver = process.env.OBJECT_STORAGE_DRIVER?.toLowerCase() === "r2" ? "r2" : "local";
  return {
    driver,
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicBucket: process.env.R2_PUBLIC_BUCKET,
    privateBucket: process.env.R2_PRIVATE_BUCKET,
    publicUrl: process.env.R2_PUBLIC_URL?.replace(/\/$/, ""),
  };
}

function requireR2Config() {
  const value = config();
  const required = [
    value.accountId,
    value.accessKeyId,
    value.secretAccessKey,
    value.publicBucket,
    value.privateBucket,
    value.publicUrl,
  ];
  if (required.some((item) => !item)) {
    throw new Error(
      "R2 nie jest w pełni skonfigurowane. Sprawdź R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BUCKET, R2_PRIVATE_BUCKET i R2_PUBLIC_URL.",
    );
  }
  return value as Required<Omit<StorageConfig, "driver">> & { driver: "r2" };
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}
function bufferToArrayBuffer(value: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(value.byteLength);
  bytes.set(value);
  return bytes.buffer;
}

function encodeKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function awsDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function signedR2Request(input: {
  method: "GET" | "PUT" | "DELETE";
  bucket: string;
  key: string;
  body?: Buffer;
  contentType?: string;
  cacheControl?: string;
}) {
  const value = requireR2Config();
  const now = new Date();
  const amzDate = awsDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(input.body ?? "");
  const host = `${value.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeURIComponent(input.bucket)}/${encodeKey(input.key)}`;
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    input.method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${value.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${value.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: input.method,
    headers: {
      Authorization: authorization,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      ...(input.contentType ? { "Content-Type": input.contentType } : {}),
      ...(input.cacheControl ? { "Cache-Control": input.cacheControl } : {}),
    },
    body:
      input.method === "PUT" && input.body
        ? bufferToArrayBuffer(input.body)
        : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 1_500);
    throw new Error(`R2 ${input.method} ${response.status}: ${details}`);
  }
  return response;
}

export function usesR2Storage() {
  return config().driver === "r2";
}

export async function storePublicImage(input: {
  listingId: string;
  fileName: string;
  body: Buffer;
}) {
  const value = config();
  if (value.driver === "local") {
    const dir = path.join(process.cwd(), "public", "uploads", input.listingId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, input.fileName), input.body);
    return `/uploads/${input.listingId}/${input.fileName}`;
  }

  const r2 = requireR2Config();
  const key = `listings/${input.listingId}/${input.fileName}`;
  await signedR2Request({
    method: "PUT",
    bucket: r2.publicBucket,
    key,
    body: input.body,
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000, immutable",
  });
  return `${r2.publicUrl}/${key}`;
}

export async function storePrivateImage(input: {
  userId: string;
  listingId: string;
  fileName: string;
  body: Buffer;
}) {
  const value = config();
  if (value.driver === "local") {
    const dir = path.join(process.cwd(), ".data", "private", input.userId, input.listingId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, input.fileName), input.body);
  } else {
    const r2 = requireR2Config();
    await signedR2Request({
      method: "PUT",
      bucket: r2.privateBucket,
      key: `verification/${input.userId}/${input.listingId}/${input.fileName}`,
      body: input.body,
      contentType: "image/webp",
      cacheControl: "private, no-store",
    });
  }
  return `/api/private-file/${input.listingId}/${input.fileName}`;
}

export async function readPrivateImage(input: {
  userId: string;
  listingId: string;
  fileName: string;
}): Promise<StoredObject> {
  const value = config();
  if (value.driver === "local") {
    const body = await readFile(
      path.join(process.cwd(), ".data", "private", input.userId, input.listingId, input.fileName),
    );
    return {
      body: bufferToArrayBuffer(body),
      contentType: "image/webp",
    };
  }

  const r2 = requireR2Config();
  const response = await signedR2Request({
    method: "GET",
    bucket: r2.privateBucket,
    key: `verification/${input.userId}/${input.listingId}/${input.fileName}`,
  });
  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") || "image/webp",
  };
}
