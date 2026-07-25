// Free pivot (Jul 24 2026): the $30 map-to-Core upgrade is retired; Core is
// free. Old upgrade links land on free signup.
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
