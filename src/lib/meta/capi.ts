// Server-side Conversions API (CAPI) helper for Meta Pixel ID
// 1237498758330884. Fires to graph.facebook.com/v20.0/{pixel_id}/events.
//
// Why server-side: iOS 18 ATT opt-out is 75% — pixel-only misses 3 of 4 iOS
// conversions. CAPI sends the same event server-to-server, invisible to
// browser tracking blockers. Must dedup against the browser-fired pixel
// event via a matching `event_id` (see lib/meta/events.ts).

import { hashSHA256, normalizePhone, normalizeName } from "./hashing";

export interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  /** ISO 3166-1 alpha-2, lowercase (e.g., 'us') */
  country?: string;
  /** Internal user id — hashed before send */
  externalId?: string;
  /** Facebook click ID from _fbc cookie */
  fbc?: string;
  /** Facebook browser ID from _fbp cookie */
  fbp?: string;
  clientIp?: string;
  clientUserAgent?: string;
}

export interface CapiEvent {
  eventName: string;
  /** MUST match the pixel-fired event_id for dedup */
  eventId: string;
  /** Unix seconds, defaults to now */
  eventTime?: number;
  eventSourceUrl: string;
  userData: UserData;
  customData?: Record<string, unknown>;
  actionSource?: "website" | "app" | "system_generated";
}

export interface CapiResult {
  success: boolean;
  response?: unknown;
  error?: string;
}

export async function sendCapiEvent(event: CapiEvent): Promise<CapiResult> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const apiVersion = process.env.META_GRAPH_API_VERSION || "v20.0";

  if (!pixelId || !accessToken) {
    return {
      success: false,
      error: "Missing META_CAPI_ACCESS_TOKEN or NEXT_PUBLIC_META_PIXEL_ID",
    };
  }

  const userData: Record<string, string | undefined> = {
    em: hashSHA256(event.userData.email),
    ph: event.userData.phone
      ? hashSHA256(normalizePhone(event.userData.phone))
      : undefined,
    fn: event.userData.firstName
      ? hashSHA256(normalizeName(event.userData.firstName))
      : undefined,
    ln: event.userData.lastName
      ? hashSHA256(normalizeName(event.userData.lastName))
      : undefined,
    ct: event.userData.city
      ? hashSHA256(normalizeName(event.userData.city))
      : undefined,
    st: event.userData.state
      ? hashSHA256(normalizeName(event.userData.state))
      : undefined,
    zp: event.userData.zip ? hashSHA256(event.userData.zip.trim()) : undefined,
    country: event.userData.country
      ? hashSHA256(event.userData.country.toLowerCase())
      : undefined,
    external_id: event.userData.externalId
      ? hashSHA256(event.userData.externalId)
      : undefined,
    fbc: event.userData.fbc,
    fbp: event.userData.fbp,
    client_ip_address: event.userData.clientIp,
    client_user_agent: event.userData.clientUserAgent,
  };

  // Strip undefined keys before send — Meta rejects null user_data values.
  const cleanUserData = Object.fromEntries(
    Object.entries(userData).filter(([, v]) => v !== undefined),
  );

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        action_source: event.actionSource ?? "website",
        user_data: cleanUserData,
        custom_data: event.customData ?? {},
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = (await response.json()) as unknown;
    if (!response.ok) {
      console.error("[Meta CAPI] error:", json);
      return { success: false, error: JSON.stringify(json) };
    }
    return { success: true, response: json };
  } catch (err) {
    console.error("[Meta CAPI] network error:", err);
    return { success: false, error: String(err) };
  }
}
