"use client";

// Fires Meta Pixel + CAPI Tool_Used custom event when a tool page mounts.
// Semantically "tool opened", which is close enough to "Tool_Used" for
// Phase 0 — the actual /dashboard/tools/[slug] route already gates on
// course_access, so this fires only for users who unlocked the tool.
// Pixel + CAPI use a matching event_id so Meta dedups into one count.

import { useEffect } from "react";
import { trackPixelEvent, getFbc, getFbp } from "@/lib/meta/pixel";
import { META_EVENTS, generateEventId } from "@/lib/meta/events";

interface Props {
  toolSlug: string;
}

export function TrackToolUsed({ toolSlug }: Props) {
  useEffect(() => {
    const eventId = generateEventId();

    trackPixelEvent({
      eventName: META_EVENTS.TOOL_USED,
      eventId,
      customData: { content_name: toolSlug, content_category: "blueprint_tool" },
    });

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: META_EVENTS.TOOL_USED,
        eventId,
        eventSourceUrl: window.location.href,
        userData: {
          fbc: getFbc(),
          fbp: getFbp(),
        },
        customData: {
          content_name: toolSlug,
          content_category: "blueprint_tool",
        },
      }),
    }).catch(() => {
      // best-effort — pixel leg already fired
    });
  }, [toolSlug]);

  return null;
}
