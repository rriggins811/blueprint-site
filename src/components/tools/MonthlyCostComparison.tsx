"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

type MonthlyCosts = {
  baseRate: number;
  personalCare: number;
  medManagement: number;
  memoryCare: number;
  cableInternet: number;
  petFee: number;
  incontinence: number;
  otherAddOns: number;
};

type MoveInCosts = {
  entranceFee: number;
  securityDeposit: number;
  firstMonth: number;
  lastMonth: number;
  other: number;
};

type Questions = {
  acceptsMedicaid: boolean;
  careWithoutMoving: boolean;
  rateHistory: boolean;
};

type Community = {
  name: string;
  monthly: MonthlyCosts;
  moveIn: MoveInCosts;
  questions: Questions;
};

type CommunityKey = "a" | "b" | "c";

type State = {
  a: Community;
  b: Community;
  c: Community;
  showThird: boolean;
};

const EMPTY_MONTHLY: MonthlyCosts = {
  baseRate: 0,
  personalCare: 0,
  medManagement: 0,
  memoryCare: 0,
  cableInternet: 0,
  petFee: 0,
  incontinence: 0,
  otherAddOns: 0,
};

const EMPTY_MOVE_IN: MoveInCosts = {
  entranceFee: 0,
  securityDeposit: 0,
  firstMonth: 0,
  lastMonth: 0,
  other: 0,
};

const EMPTY_QUESTIONS: Questions = {
  acceptsMedicaid: false,
  careWithoutMoving: false,
  rateHistory: false,
};

function emptyCommunity(name: string): Community {
  return {
    name,
    monthly: { ...EMPTY_MONTHLY },
    moveIn: { ...EMPTY_MOVE_IN },
    questions: { ...EMPTY_QUESTIONS },
  };
}

const MONTHLY_FIELDS: Array<{ key: keyof MonthlyCosts; label: string }> = [
  { key: "baseRate", label: "Base monthly rate" },
  { key: "personalCare", label: "Personal care services (bathing, dressing, etc.)" },
  { key: "medManagement", label: "Medication management" },
  { key: "memoryCare", label: "Memory care surcharge (if applicable)" },
  { key: "cableInternet", label: "Cable / internet" },
  { key: "petFee", label: "Pet fee (if applicable)" },
  { key: "incontinence", label: "Incontinence supplies" },
  { key: "otherAddOns", label: "Other add-ons (meals extras, laundry, rides, etc.)" },
];

const MOVE_IN_FIELDS: Array<{ key: keyof MoveInCosts; label: string }> = [
  { key: "entranceFee", label: "Entrance / community fee" },
  { key: "securityDeposit", label: "Security deposit" },
  { key: "firstMonth", label: "First month's rent" },
  { key: "lastMonth", label: "Last month's rent" },
  { key: "other", label: "Other" },
];

const QUESTION_FIELDS: Array<{ key: keyof Questions; label: string }> = [
  { key: "acceptsMedicaid", label: "Does the community accept Medicaid?" },
  { key: "careWithoutMoving", label: "Does the contract allow care level increases without moving?" },
  { key: "rateHistory", label: "Did you get the annual rate increase history?" },
];

function monthlyTotal(c: Community): number {
  return MONTHLY_FIELDS.reduce((sum, f) => sum + (Number(c.monthly[f.key]) || 0), 0);
}

function moveInTotal(c: Community): number {
  return MOVE_IN_FIELDS.reduce((sum, f) => sum + (Number(c.moveIn[f.key]) || 0), 0);
}

function yearOneTotal(c: Community): number {
  return monthlyTotal(c) * 12 + moveInTotal(c);
}

function displayName(c: Community, key: CommunityKey): string {
  return c.name.trim() || `Community ${key.toUpperCase()}`;
}

export function MonthlyCostComparison() {
  const [state, setState, status] = useToolState<State>("tool-07a-v2", {
    a: emptyCommunity(""),
    b: emptyCommunity(""),
    c: emptyCommunity(""),
    showThird: false,
  });

  const activeKeys: CommunityKey[] = state.showThird ? ["a", "b", "c"] : ["a", "b"];

  const updateCommunity = (key: CommunityKey, patch: (c: Community) => Community) => {
    setState((prev) => ({ ...prev, [key]: patch(prev[key]) }));
  };

  const setName = (key: CommunityKey, name: string) =>
    updateCommunity(key, (c) => ({ ...c, name }));

  const setMonthly = (key: CommunityKey, field: keyof MonthlyCosts, value: number) =>
    updateCommunity(key, (c) => ({ ...c, monthly: { ...c.monthly, [field]: value } }));

  const setMoveIn = (key: CommunityKey, field: keyof MoveInCosts, value: number) =>
    updateCommunity(key, (c) => ({ ...c, moveIn: { ...c.moveIn, [field]: value } }));

  const toggleQuestion = (key: CommunityKey, field: keyof Questions) =>
    updateCommunity(key, (c) => ({
      ...c,
      questions: { ...c.questions, [field]: !c.questions[field] },
    }));

  const yearTotals = activeKeys.map((key) => yearOneTotal(state[key]));
  const positiveTotals = yearTotals.filter((t) => t > 0);
  const cheapest = positiveTotals.length > 1 ? Math.min(...positiveTotals) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          Compare up to 3 communities side by side. Include ALL costs, not just the base rate.
        </p>
        <SaveIndicator status={status} />
      </div>

      {/* Callout: the real number */}
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">Get the real number.</span> The base rate on the
          brochure is almost never the total. Ask each community, in writing: what is the
          all-in monthly cost for a resident who needs help with bathing, dressing, and
          medication management? A $4,500 base can become $6,500 to $7,500 fast. That is the
          number to compare.
        </p>
      </section>

      {/* Community columns */}
      <div className={`grid gap-4 md:grid-cols-2 ${state.showThird ? "lg:grid-cols-3" : ""}`}>
        {activeKeys.map((key) => (
          <div key={key} className="rounded-lg border border-neutral-200 p-5">
            <div className="flex items-start justify-between gap-2">
              <input
                type="text"
                value={state[key].name}
                onChange={(e) => setName(key, e.target.value)}
                className="w-full border-b border-neutral-300 pb-1 text-lg font-semibold"
                placeholder={`Community ${key.toUpperCase()}`}
              />
              {key === "c" && (
                <button
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, showThird: false }))}
                  className="shrink-0 text-xs text-neutral-500 underline hover:text-neutral-700"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Monthly costs */}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Monthly costs
            </p>
            <div className="mt-2 space-y-2">
              {MONTHLY_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-neutral-700">{f.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={state[key].monthly[f.key]}
                    onChange={(e) => setMonthly(key, f.key, Number(e.target.value) || 0)}
                    className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-right"
                  />
                </label>
              ))}
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                <span className="text-sm font-semibold">Total monthly cost</span>
                <span className="text-base font-semibold">{fmtUsd(monthlyTotal(state[key]))}</span>
              </div>
            </div>

            {/* Move-in costs */}
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Move-in costs
            </p>
            <div className="mt-2 space-y-2">
              {MOVE_IN_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-neutral-700">{f.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={state[key].moveIn[f.key]}
                    onChange={(e) => setMoveIn(key, f.key, Number(e.target.value) || 0)}
                    className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-right"
                  />
                </label>
              ))}
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                <span className="text-sm font-semibold">Total move-in</span>
                <span className="text-base font-semibold">{fmtUsd(moveInTotal(state[key]))}</span>
              </div>
            </div>

            {/* Key questions */}
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Key questions to confirm
            </p>
            <div className="mt-2 space-y-2">
              {QUESTION_FIELDS.map((q) => (
                <label key={q.key} className="flex items-start gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={state[key].questions[q.key]}
                    onChange={() => toggleQuestion(key, q.key)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300"
                  />
                  <span>{q.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {!state.showThird && (
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, showThird: true }))}
            className="flex min-h-32 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-5 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 md:col-span-2"
          >
            + Add a third community
          </button>
        )}
      </div>

      {/* Annual cost projection */}
      <section className="rounded-lg border-2 border-neutral-300 p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Annual cost projection
        </p>
        <div className={`mt-4 grid gap-4 ${state.showThird ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {activeKeys.map((key) => {
            const c = state[key];
            const monthly = monthlyTotal(c);
            const moveIn = moveInTotal(c);
            const year1 = monthly * 12 + moveIn;
            const isCheapest = cheapest !== null && year1 === cheapest;
            return (
              <div
                key={key}
                className={`rounded-lg border p-4 ${
                  isCheapest
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-neutral-200"
                }`}
              >
                <p className="truncate text-sm font-semibold">{displayName(c, key)}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-neutral-600">Monthly x 12</dt>
                    <dd>{fmtUsd(monthly * 12)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-neutral-600">+ Move-in costs</dt>
                    <dd>{fmtUsd(moveIn)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-2">
                    <dt className="font-semibold">Year 1 total</dt>
                    <dd className="text-lg font-semibold">{fmtUsd(year1)}</dd>
                  </div>
                </dl>
                {isCheapest && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Lowest Year 1 cost
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
