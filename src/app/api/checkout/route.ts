// Free pivot (Jul 24 2026): the Blueprint and the Roadmap are free. Stripe
// checkout is retired. Anything still POSTing here (old links, cached pages,
// external references) lands on the free signup instead of a dead end.
// The Stripe webhook stays live separately to service legacy refunds.
import { NextResponse } from "next/server";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

function dest(): URL {
  return new URL("/signup", SITE.url);
}

export async function POST() {
  return NextResponse.redirect(dest(), 303);
}

export async function GET() {
  return NextResponse.redirect(dest(), 308);
}
