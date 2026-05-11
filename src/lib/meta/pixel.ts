// Client-side Meta Pixel helpers.
//
// - trackPixelEvent fires a conversion event from the browser via fbq()
//   with an eventID that the server CAPI fire must match for dedup.
// - getFbc / getFbp read the Meta browser ID cookies for CAPI user_data.
// - captureFbclidOnLanding writes a synthetic _fbc cookie when a user
//   lands on a page with ?fbclid=… in the URL, so the click ID survives
//   for downstream form submits.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

interface TrackEventOptions {
  eventName: string;
  /** Must match the CAPI event_id sent server-side for dedup */
  eventId: string;
  customData?: Record<string, unknown>;
}

export function trackPixelEvent({
  eventName,
  eventId,
  customData,
}: TrackEventOptions): void {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", eventName, customData ?? {}, { eventID: eventId });
}

export function getFbc(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/_fbc=([^;]+)/);
  return match?.[1];
}

export function getFbp(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match?.[1];
}

// Meta's docs: if a user lands with ?fbclid=… and no _fbc cookie exists yet,
// synthesize one so the click ID survives across pages until form submit.
// Format per Meta spec: `fb.{subdomain_index}.{ts_ms}.{fbclid}`. We use
// subdomain_index = 1 (apex-level cookie) since SameSite=Lax + path=/ gives
// us cross-subdomain coverage on rigginsstrategicsolutions.com.
export function captureFbclidOnLanding(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid");
  if (!fbclid) return;
  if (document.cookie.includes("_fbc=")) return;
  const fbc = `fb.1.${Date.now()}.${fbclid}`;
  document.cookie = `_fbc=${fbc}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
}
