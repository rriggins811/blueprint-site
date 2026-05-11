// SHA-256 hashing + Meta-spec normalization for CAPI user_data.
// All PII is hashed BEFORE leaving the server. The Graph API rejects events
// with raw PII in user_data; only hashed values are accepted.

import { createHash } from "node:crypto";

export function hashSHA256(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

// Meta phone normalization: strip everything that isn't a digit, then hash.
// Country code optional but recommended (e.g. "13365538933" not "3365538933").
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Meta name normalization: lowercase + trim. Apostrophes, hyphens, accents
// are kept (Meta normalizes them server-side after we hash).
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}
