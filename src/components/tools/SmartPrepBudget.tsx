"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

// 12 prep categories ranked by typical ROI on a senior-transition home sale.
// "weight" controls the recommended allocation when the budget is tight.
const CATEGORIES: Array<{
  key: string;
  label: string;
  blurb: string;
  weight: number;
  mustDo?: boolean;
}> = [
  {
    key: "deepClean",
    label: "Whole-home deep clean",
    blurb: "First impression. Pros run $400-700.",
    weight: 7,
    mustDo: true,
  },
  {
    key: "declutter",
    label: "Declutter and dump runs",
    blurb: "Junk removal + dump fees. Buyers can't see the house under stuff.",
    weight: 7,
    mustDo: true,
  },
  {
    key: "paint",
    label: "Interior paint (key rooms)",
    blurb: "Living, kitchen, primary bedroom. Highest visual return per dollar.",
    weight: 9,
  },
  {
    key: "curbAppeal",
    label: "Curb appeal: mow, mulch, trim",
    blurb: "30 minutes from the road decides if buyers come inside.",
    weight: 6,
  },
  {
    key: "lighting",
    label: "Lighting: bulbs and fixtures",
    blurb: "LED daylight bulbs everywhere. Cheap, dramatic.",
    weight: 4,
  },
  {
    key: "minorRepairs",
    label: "Minor repairs (sticking doors, leaks, holes)",
    blurb: "The list of small things buyers count up against you.",
    weight: 7,
    mustDo: true,
  },
  {
    key: "carpet",
    label: "Carpet clean or replace high-traffic",
    blurb: "Clean first. Replace only if cleaning won't fix it.",
    weight: 5,
  },
  {
    key: "kitchenBath",
    label: "Kitchen / bath cosmetic refresh",
    blurb: "Cabinet paint, hardware, caulk lines. Skip a full reno.",
    weight: 6,
  },
  {
    key: "staging",
    label: "Light staging (rentals or borrows)",
    blurb: "Two rooms staged, the rest depersonalized. Sells the lifestyle.",
    weight: 5,
  },
  {
    key: "photos",
    label: "Professional listing photos",
    blurb: "Non-negotiable. Includes drone if appropriate.",
    weight: 4,
    mustDo: true,
  },
  {
    key: "safetyAccess",
    label: "Safety: railings, lighting, smoke alarms",
    blurb: "Low cost, high inspection liability if missed.",
    weight: 5,
  },
  {
    key: "preInspect",
    label: "Pre-listing inspection",
    blurb: "Optional but powerful. Reveals the surprises before the buyer's inspector does.",
    weight: 3,
  },
];

type State = {
  budget: number;
  selected: Record<string, boolean>;
  spend: Record<string, number>;
};

const DEFAULTS: State = {
  budget: 5000,
  selected: Object.fromEntries(CATEGORIES.filter((c) => c.mustDo).map((c) => [c.key, true])),
  spend: {},
};

function recommendedSpend(
  state: State,
  cat: (typeof CATEGORIES)[number]
): number {
  if (!state.selected[cat.key]) return 0;
  const totalWeight = CATEGORIES.filter((c) => state.selected[c.key]).reduce(
    (sum, c) => sum + c.weight,
    0
  );
  if (totalWeight === 0) return 0;
  return Math.round((state.budget * cat.weight) / totalWeight / 25) * 25;
}

export function SmartPrepBudget() {
  const [state, setState, status] = useToolState<State>("tool-05a", DEFAULTS);

  const setBudget = (n: number) => setState((p) => ({ ...p, budget: n }));
  const toggle = (key: string) =>
    setState((p) => ({
      ...p,
      selected: { ...p.selected, [key]: !p.selected[key] },
    }));
  const setSpend = (key: string, n: number) =>
    setState((p) => ({ ...p, spend: { ...p.spend, [key]: n } }));

  const allocated = CATEGORIES.reduce(
    (sum, c) => sum + (state.selected[c.key] ? recommendedSpend(state, c) : 0),
    0
  );
  const actualSpent = Object.values(state.spend).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );
  const remaining = state.budget - actualSpent;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          Pick what you'll do, see the recommended allocation, then track what you actually spent.
        </p>
        <SaveIndicator status={status} />
      </div>

      <section className="rounded-lg border border-neutral-200 p-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">
            Total prep budget
          </span>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={state.budget}
              onChange={(e) => setBudget(Number(e.target.value) || 0)}
              className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-right"
            />
            <span className="text-xs text-neutral-500">
              ($5,000 is a tight, realistic starting point)
            </span>
          </div>
        </label>
      </section>

      <ul className="space-y-3">
        {CATEGORIES.map((c) => {
          const selected = !!state.selected[c.key];
          const recommended = recommendedSpend(state, c);
          return (
            <li
              key={c.key}
              className={
                "rounded-lg border p-4 " +
                (selected ? "border-neutral-300 bg-white" : "border-neutral-200 bg-neutral-50")
              }
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(c.key)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-neutral-900">
                      {c.label}
                      {c.mustDo ? (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Must do
                        </span>
                      ) : null}
                    </span>
                    {selected ? (
                      <span className="text-sm text-amber-700">
                        Recommended: <strong>{fmtUsd(recommended)}</strong>
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{c.blurb}</p>
                  {selected ? (
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-neutral-700">Actual spend:</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={state.spend[c.key] ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setSpend(c.key, Number(e.target.value) || 0)
                        }
                        className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-right"
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="rounded-lg border-2 border-neutral-300 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Budget
            </p>
            <p className="mt-1 text-2xl font-semibold">{fmtUsd(state.budget)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Recommended allocation
            </p>
            <p className="mt-1 text-2xl font-semibold">{fmtUsd(allocated)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Remaining vs actual
            </p>
            <p
              className={
                "mt-1 text-2xl font-semibold " +
                (remaining < 0 ? "text-red-700" : "text-emerald-700")
              }
            >
              {fmtUsd(remaining)}
            </p>
          </div>
        </div>
        {remaining < 0 ? (
          <p className="mt-3 text-sm text-red-700">
            Over budget by {fmtUsd(Math.abs(remaining))}. Cut from the lowest-weight
            categories first.
          </p>
        ) : null}
      </section>
    </div>
  );
}
