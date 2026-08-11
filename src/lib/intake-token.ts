// HMAC-SHA256 signed intake tokens. The Roadmap confirmation email links a
// family straight to their intake form: the token identifies which
// roadmap_applications row the answers belong to and proves the link reached
// the person we emailed. It is NOT authentication, and it deliberately grants
// nothing except the ability to fill in that one application's intake.
//
// Token shape:  base64url(payloadJson) "." base64url(hmac)
// Payload: { applicationId, exp }  (exp is unix ms)
// Default TTL: 90 days, because a family can sit on this for weeks while a
// real crisis plays out, and an expired link is a dead end we do not want.
//
// Deliberately mirrors lib/activation-token.ts rather than refactoring it into
// a shared module: that file is on the live freeguide activation path and this
// change had no reason to touch it. If a third signed-token use appears, pull
// the common half out then.

import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export type IntakePayload = {
  applicationId: string;
  exp: number;
};

function getSecret(): string {
  const s = process.env.INTAKE_TOKEN_SECRET;
  if (!s) {
    throw new Error("INTAKE_TOKEN_SECRET is not set");
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  return Buffer.from(padded, "base64");
}

function sign(payloadB64: string): Buffer {
  return createHmac("sha256", getSecret()).update(payloadB64).digest();
}

export function mintIntakeToken(input: {
  applicationId: string;
  ttlMs?: number;
}): string {
  const payload: IntakePayload = {
    applicationId: input.applicationId,
    exp: Date.now() + (input.ttlMs ?? TOKEN_TTL_MS),
  };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${payloadB64}.${b64url(sign(payloadB64))}`;
}

export type IntakeVerifyResult =
  | { ok: true; payload: IntakePayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "bad_payload" };

export function verifyIntakeToken(token: string | null | undefined): IntakeVerifyResult {
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
  if (provided.length !== expected.length) return { ok: false, reason: "bad_signature" };
  if (!timingSafeEqual(provided, expected)) return { ok: false, reason: "bad_signature" };

  let payload: IntakePayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "bad_payload" };
  }
  if (typeof payload.applicationId !== "string" || typeof payload.exp !== "number") {
    return { ok: false, reason: "bad_payload" };
  }
  if (payload.exp < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

/** The link that goes in the Roadmap confirmation email. */
export function intakeUrl(applicationId: string, origin: string): string {
  return `${origin}/roadmap/intake?t=${encodeURIComponent(mintIntakeToken({ applicationId }))}`;
}
