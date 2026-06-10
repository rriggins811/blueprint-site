/**
 * Sanitize a post-login `next` redirect target. Only same-site, absolute paths
 * are allowed: the value must start with a single "/" and must not start with
 * "//" (protocol-relative) or contain a scheme. Anything else falls back to the
 * default, which prevents open-redirect attacks via ?next=https://evil.com or
 * ?next=//evil.com.
 */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  // Must be a root-relative path, not protocol-relative, no scheme, no backslash trick.
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.startsWith("/\\")) return fallback;
  if (/^\/[^/]*:/.test(value)) return fallback; // e.g. "/javascript:..." edge cases
  return value;
}
