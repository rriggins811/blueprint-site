// HMAC-SHA256 signed activation tokens. Used for the freeguide email flow:
// the user submits the form, we email them a link with a signed token, they
// click and set their password on /activate. The token does NOT auth the
// user — it just identifies them and proves their email reached them.
//
// Token shape:  base64url(payloadJson) "." base64url(hmac)
// Payload: { email, firstName?, lastName?, exp }  (exp is unix ms)
// Default TTL: 7 days.

import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type ActivationPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  exp: number;
};

function getSecret(): string {
  const s = process.env.ACTIVATION_TOKEN_SECRET;
  if (!s) {
    throw new Error("ACTIVATION_TOKEN_SECRET is not set");
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  return Buffer.from(padded, "base64");
}

function sign(payloadB64: string): Buffer {
  return createHmac("sha256", getSecret()).update(payloadB64).digest();
}

export function mintActivationToken(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  ttlMs?: number;
}): string {
  const payload: ActivationPayload = {
    email: input.email.toLowerCase().trim(),
    firstName: input.firstName,
    lastName: input.lastName,
    exp: Date.now() + (input.ttlMs ?? TOKEN_TTL_MS),
  };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sigB64 = b64url(sign(payloadB64));
  return `${payloadB64}.${sigB64}`;
}

export type VerifyResult =
  | { ok: true; payload: ActivationPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "bad_payload" };

export function verifyActivationToken(token: string | null | undefined): VerifyResult {
  if (!token || !token.includes(".")) return { ok: false, reason: "malformed" };
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return { ok: false, reason: "malformed" };

  const expected = sign(payloadB64);
  let provided: Buffer;
  try {
    provided = b64urlDecode(sigB64);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (provided.length !== expected.length) {
    return { ok: false, reason: "bad_signature" };
  }
  if (!timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: ActivationPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "bad_payload" };
  }
  if (
    typeof payload.email !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return { ok: false, reason: "bad_payload" };
  }
  if (payload.exp < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}
