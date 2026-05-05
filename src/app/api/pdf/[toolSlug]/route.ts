import { NextResponse, type NextRequest } from "next/server";
import { getTool } from "@/lib/tools-registry";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { parseCourseAccess, isToolUnlocked } from "@/lib/access";

export const runtime = "nodejs";

// Returns a short-lived signed URL for the PDF associated with the given tool.
// Auth-gated: the user must be logged in and have a course_access entry.
// Premium-only tools require blueprint_premium specifically.
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ toolSlug: string }> }
) {
  const { toolSlug } = await ctx.params;
  const tool = getTool(toolSlug);
  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("course_access")
    .eq("user_id", user.id)
    .maybeSingle();
  const access = parseCourseAccess(profile?.course_access);

  if (!isToolUnlocked(tool.slug, access)) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  // Use the admin client to mint a signed URL. Bucket is private.
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from("blueprint-tools")
    .createSignedUrl(`${tool.pdfName}.pdf`, 60 * 5, {
      download: `${tool.pdfName}.pdf`,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Could not sign URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
