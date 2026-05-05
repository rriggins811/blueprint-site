import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TOOLS, getTool } from "@/lib/tools-registry";
import { MODULES } from "@/lib/blueprint-modules";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseCourseAccess, isToolUnlocked } from "@/lib/access";
import { QuickStart7Day } from "@/components/tools/QuickStart7Day";
import { StartingPointAssessment } from "@/components/tools/StartingPointAssessment";
import { TransitionCostEstimator } from "@/components/tools/TransitionCostEstimator";
import { MonthlyCostComparison } from "@/components/tools/MonthlyCostComparison";
import { ComparisonScorecard } from "@/components/tools/ComparisonScorecard";
import { NetProceeds } from "@/components/tools/NetProceeds";
import { AgingCostCalculator } from "@/components/tools/AgingCostCalculator";
import { BurnoutAssessment } from "@/components/tools/BurnoutAssessment";
import { SmartPrepBudget } from "@/components/tools/SmartPrepBudget";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.filter((t) => t.componentKey).map((t) => ({
    toolSlug: t.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ toolSlug: string }>;
}) {
  const { toolSlug } = await params;
  const tool = getTool(toolSlug);
  return { title: tool ? tool.title : "Tool not found" };
}

const TOOL_COMPONENTS = {
  "quick-start-7day": QuickStart7Day,
  "starting-point-assessment": StartingPointAssessment,
  "transition-cost-estimator": TransitionCostEstimator,
  "monthly-cost-comparison": MonthlyCostComparison,
  "comparison-scorecard": ComparisonScorecard,
  "net-proceeds": NetProceeds,
  "aging-cost-calculator": AgingCostCalculator,
  "burnout-assessment": BurnoutAssessment,
  "smart-prep-budget": SmartPrepBudget,
} as const;

export default async function ToolPage({
  params,
}: {
  params: Promise<{ toolSlug: string }>;
}) {
  const { toolSlug } = await params;
  const tool = getTool(toolSlug);
  if (!tool || !tool.componentKey) notFound();

  const Component = TOOL_COMPONENTS[tool.componentKey];
  if (!Component) notFound();

  // Tier guard: direct URL to a locked tool redirects to /pricing.
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
  if (!isToolUnlocked(tool.slug, access)) {
    redirect("/pricing");
  }

  const parentModule = MODULES.find((m) => m.slug === tool.moduleSlug);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      {parentModule ? (
        <Link
          href={`/dashboard/${parentModule.slug}`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          &larr; Module {parentModule.number}: {parentModule.title}
        </Link>
      ) : (
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
          &larr; All modules
        </Link>
      )}

      <header className="mt-4">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Tool {tool.slug.replace("tool-", "").toUpperCase()}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tool.title}</h1>
        <p className="mt-2 text-neutral-600">{tool.description}</p>
      </header>

      <section className="mt-8">
        <Component />
      </section>
    </main>
  );
}
