// Shared event definitions for Pixel + CAPI dedup.
//
// IMPORTANT: Do NOT use 'OrderFormPurchase' — that legacy Squarespace event
// name is BLOCKED on Meta's side. Always use 'Purchase' (standard event) with
// content_name in customData to differentiate Core ($47) vs Premium ($297) vs
// SeniorSafe Premium ($14.99) vs SeniorSafe Premium+ ($39.99).
export const META_EVENTS = {
  LEAD: "Lead",
  TRIAL: "StartTrial",
  TOOL_USED: "Tool_Used", // custom event — neutral name, won't be flagged
  PURCHASE: "Purchase", // STANDARD event
} as const;

export type MetaEventName = (typeof META_EVENTS)[keyof typeof META_EVENTS];

// Generate a unique event_id for dedup. Must be the SAME id on both pixel
// and CAPI fire so Meta merges them into a single conversion.
export function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
