import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { MODULES } from "@/lib/blueprint-modules";
import { loadModuleContent } from "@/lib/modules-content";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { toolsForModule } from "@/lib/tools-registry";
import { parseCourseAccess, isModuleUnlocked, isToolUnlocked } from "@/lib/access";

export const dynamicParams = false;

export function generateStaticParams() {
  return MODULES.map((m) => ({ moduleSlug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ moduleSlug: string }>;
}) {
  const { moduleSlug } = await params;
  const content = await loadModuleContent(moduleSlug);
  if (!content) return { title: "Module not found" };
  return {
    title: `Module ${content.module.number}: ${content.module.title}`,
  };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleSlug: string }>;
}) {
  const { moduleSlug } = await params;
  const content = await loadModuleContent(moduleSlug);
  if (!content) notFound();

  // Tier guard. Direct URL to a locked module redirects to /pricing.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profile")
    .select("course_access")
    .eq("user_id", user.id)
    .maybeSingle();
  const access = parseCourseAccess(profile?.course_access);

  if (!isModuleUnlocked(content.module.slug, access)) {
    if (content.module.premiumOnly && access.tier === "core") {
      return <PremiumGate />;
    }
    redirect("/pricing");
  }

  const { content: rendered, frontmatter } = await compileMDX<{
    title?: string;
    subtitle?: string;
  }>({
    source: content.raw,
    options: { parseFrontmatter: true },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        &larr; All modules
      </Link>

      <header className="mt-4">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Module {content.module.number}
          {content.module.premiumOnly ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Premium
            </span>
          ) : null}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {/* Canonical title from MODULES — frontmatter.title is the .docx
              source title which differs from the dashboard card. Ryan picked
              dashboard card titles as the one canonical name (see
              BLUEPRINT_MODULE_UPDATES_NEEDED.md). */}
          {content.module.title}
        </h1>
        {frontmatter.subtitle ? (
          <p className="mt-2 text-sm text-neutral-500">{frontmatter.subtitle}</p>
        ) : null}
      </header>

      <article className="prose-blueprint mt-10">{rendered}</article>

      <ModuleTools moduleSlug={content.module.slug} access={access} />

      <footer className="mt-12 flex items-center justify-between gap-4 border-t border-neutral-200 pt-6 text-sm">
        {content.prev ? (
          <Link
            href={`/dashboard/${content.prev.slug}`}
            className="flex flex-col text-left text-neutral-500 hover:text-neutral-900"
          >
            <span className="text-xs uppercase tracking-wide">Previous</span>
            <span className="font-medium text-neutral-900">
              Module {content.prev.number}: {content.prev.title}
            </span>
          </Link>
        ) : (
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-900">
            &larr; All modules
          </Link>
        )}
        {content.next ? (
          <Link
            href={`/dashboard/${content.next.slug}`}
            className="flex flex-col text-right text-neutral-500 hover:text-neutral-900"
          >
            <span className="text-xs uppercase tracking-wide">Next</span>
            <span className="font-medium text-neutral-900">
              Module {content.next.number}: {content.next.title}
            </span>
          </Link>
        ) : null}
      </footer>
    </main>
  );
}

function ModuleTools({
  moduleSlug,
  access,
}: {
  moduleSlug: string;
  access: ReturnType<typeof parseCourseAccess>;
}) {
  const tools = toolsForModule(moduleSlug);
  if (!tools.length) return null;

  return (
    <section className="mt-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
      <h2 className="text-lg font-semibold tracking-tight">Tools for this module</h2>
      <ul className="mt-4 space-y-3">
        {tools.map((t) => {
          const unlocked = isToolUnlocked(t.slug, access);
          return (
            <li
              key={t.slug}
              className={
                "rounded-md border p-4 " +
                (unlocked ? "border-neutral-200 bg-white" : "border-neutral-200 bg-neutral-100/60")
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={
                    "font-medium " + (unlocked ? "text-neutral-900" : "text-neutral-500")
                  }
                >
                  {t.title}
                </span>
                {!unlocked ? (
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    Locked
                  </span>
                ) : t.componentKey ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Interactive
                  </span>
                ) : (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    PDF
                  </span>
                )}
              </div>
              <p
                className={
                  "mt-1 text-sm " + (unlocked ? "text-neutral-600" : "text-neutral-500")
                }
              >
                {t.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {unlocked && t.componentKey ? (
                  <Link
                    href={`/dashboard/tools/${t.slug}`}
                    className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
                  >
                    Open the calculator
                  </Link>
                ) : null}
                {unlocked ? (
                  <a
                    href={`/api/pdf/${t.slug}`}
                    className="inline-flex items-center rounded-md border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 hover:border-neutral-500"
                  >
                    Download PDF
                  </a>
                ) : (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
                  >
                    Unlock with Blueprint Core. $47
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PremiumGate() {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
        Premium content
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        This module is part of Blueprint Premium
      </h1>
      <p className="mt-3 text-sm text-neutral-600">
        Upgrade to Premium to get the personalized intake form, the 60-minute
        strategy call with Ryan, and 90 days of email support.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex justify-center rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
      >
        See Premium
      </Link>
    </main>
  );
}
