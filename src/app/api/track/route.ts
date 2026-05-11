// POST /api/track — server-side CAPI fire for client-initiated events
// (Lead, Tool_Used, etc.). The browser pre-fires the same event via fbq()
// with a matching event_id; this route hashes user_data and fires the
// equivalent server-to-server CAPI event for dedup.

import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent, type UserData } from "@/lib/meta/capi";
import { generateEventId } from "@/lib/meta/events";

export const runtime = "nodejs";

interface TrackBody {
  eventName?: string;
  eventId?: string;
  eventSourceUrl?: string;
  userData?: Partial<UserData>;
  customData?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TrackBody;
    const {
      eventName,
      eventId: providedEventId,
      eventSourceUrl,
      userData = {},
      customData = {},
    } = body;

    if (!eventName) {
      return NextResponse.json(
        { error: "eventName required" },
        { status: 400 },
      );
    }

    const eventId = providedEventId || generateEventId();

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;
    const clientUserAgent = req.headers.get("user-agent") || undefined;

    const result = await sendCapiEvent({
      eventName,
      eventId,
      eventSourceUrl: eventSourceUrl || req.headers.get("referer") || "",
      userData: { ...userData, clientIp, clientUserAgent },
      customData,
    });

    return NextResponse.json({ eventId, ...result });
  } catch (err) {
    console.error("[/api/track] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
