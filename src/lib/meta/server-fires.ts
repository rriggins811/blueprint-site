// Server-only CAPI fire helpers. Used by webhook + activation paths where
// no browser pixel can fire alongside (server-driven events). Meta accepts
// CAPI-only events fine; they just won't be deduped against a pixel event,
// which is correct for system-generated activity.

import { sendCapiEvent } from "./capi";
import { generateEventId, META_EVENTS } from "./events";

// Default source URL used when caller doesn't pass one. Matches the production
// Blueprint domain so Meta attributes the event to this property correctly.
const DEFAULT_SOURCE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blueprint.rigginsstrategicsolutions.com";

interface ServerFireOptions {
  userId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Origin URL of the event for Meta attribution */
  eventSourceUrl?: string;
  /** Internal source label, copied into customData.source */
  source: string;
  /** Optional STABLE event id. When set, Meta dedups repeat fires of the same
   *  logical event (e.g. a Stripe re-send). When omitted, a random id is used. */
  eventId?: string;
  /** Additional customData fields (value/currency/content_name for Purchase, etc.) */
  customData?: Record<string, unknown>;
}

// Generic best-effort CAPI fire. Never throws — caller logic is never
// blocked by a tracking failure.
async function fireServerEvent(
  eventName: string,
  opts: ServerFireOptions,
): Promise<void> {
  try {
    await sendCapiEvent({
      eventName,
      eventId: opts.eventId ?? generateEventId(),
      eventSourceUrl: opts.eventSourceUrl ?? DEFAULT_SOURCE_URL,
      userData: {
        email: opts.email ?? undefined,
        firstName: opts.firstName ?? undefined,
        lastName: opts.lastName ?? undefined,
        externalId: opts.userId,
      },
      customData: { source: opts.source, ...(opts.customData ?? {}) },
      actionSource: "system_generated",
    });
  } catch (err) {
    console.warn(
      `[meta-capi ${eventName}] failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
}

export function fireServerLead(opts: ServerFireOptions): Promise<void> {
  return fireServerEvent(META_EVENTS.LEAD, opts);
}

export function fireServerStartTrial(opts: ServerFireOptions): Promise<void> {
  return fireServerEvent(META_EVENTS.TRIAL, opts);
}

export function fireServerPurchase(
  opts: ServerFireOptions & {
    valueUsd: number;
    contentName: "blueprint_core" | "blueprint_premium";
    stripeSessionId?: string;
  },
): Promise<void> {
  // Stable per-purchase event id so Stripe re-sends / concurrent webhook
  // deliveries dedupe Meta-side (Meta dedups on event_id) instead of
  // double-counting ad-reported revenue. Falls back to a random id.
  const eventId =
    opts.eventId ??
    (opts.stripeSessionId ? `purchase_${opts.stripeSessionId}` : undefined);
  return fireServerEvent(META_EVENTS.PURCHASE, {
    ...opts,
    eventId,
    customData: {
      value: opts.valueUsd,
      currency: "USD",
      content_name: opts.contentName,
      ...(opts.stripeSessionId
        ? { transaction_id: opts.stripeSessionId }
        : {}),
      ...(opts.customData ?? {}),
    },
  });
}
