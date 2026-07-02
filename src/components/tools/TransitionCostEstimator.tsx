"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

type State = {
  // Section 1: transition costs (estimate + optional actual)
  movingEstimate: number;
  movingActual: number;
  prepEstimate: number;
  prepActual: number;
  entranceFee: number;
  monthlyFacility: number;
  earlyMonths: number;
  seniorLivingActual: number;
  legalEstimate: number;
  legalActual: number;
  overlapMonths: number;
  overlapMonthlyCost: number;
  overlapActual: number;
  // Section 2: funding sources
  salePrice: number;
  mortgagePayoff: number;
  agentCommissionPct: number;
  homeSaleActual: number;
  savingsEstimate: number;
  savingsActual: number;
  ltcEstimate: number;
  ltcActual: number;
  familyEstimate: number;
  familyActual: number;
  otherEstimate: number;
  otherActual: number;
};

const DEFAULTS: State = {
  movingEstimate: 3500,
  movingActual: 0,
  prepEstimate: 8000,
  prepActual: 0,
  entranceFee: 5000,
  monthlyFacility: 5500,
  earlyMonths: 3,
  seniorLivingActual: 0,
  legalEstimate: 2500,
  legalActual: 0,
  overlapMonths: 2,
  overlapMonthlyCost: 4500,
  overlapActual: 0,
  salePrice: 350000,
  mortgagePayoff: 0,
  agentCommissionPct: 6,
  homeSaleActual: 0,
  savingsEstimate: 0,
  savingsActual: 0,
  ltcEstimate: 0,
  ltcActual: 0,
  familyEstimate: 0,
  familyActual: 0,
  otherEstimate: 0,
  otherActual: 0,
};

export function TransitionCostEstimator() {
  const [state, setState, status] = useToolState<State>("tool-06d-v2", DEFAULTS);

  const update = (key: keyof State, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Section 1 math
  const seniorLivingEstimate =
    state.entranceFee + state.monthlyFacility * state.earlyMonths;
  const overlapEstimate = state.overlapMonths * state.overlapMonthlyCost;

  const costRows: Array<{ name: string; estimate: number; actual: number }> = [
    { name: "1. Moving costs", estimate: state.movingEstimate, actual: state.movingActual },
    { name: "2. Home preparation", estimate: state.prepEstimate, actual: state.prepActual },
    { name: "3. Senior living costs", estimate: seniorLivingEstimate, actual: state.seniorLivingActual },
    { name: "4. Legal and professional fees", estimate: state.legalEstimate, actual: state.legalActual },
    { name: "5. Overlap period", estimate: overlapEstimate, actual: state.overlapActual },
  ];
  const totalEstimatedCost = costRows.reduce((sum, r) => sum + r.estimate, 0);
  const anyActualCosts = costRows.some((r) => r.actual > 0);
  const totalActualCost = costRows.reduce((sum, r) => sum + r.actual, 0);

  // Section 2 math
  const commission = state.salePrice * (state.agentCommissionPct / 100);
  const homeSaleProceeds = state.salePrice - state.mortgagePayoff - commission;

  const fundingRows: Array<{ name: string; estimate: number; actual: number }> = [
    { name: "Home sale proceeds (after mortgage payoff)", estimate: homeSaleProceeds, actual: state.homeSaleActual },
    { name: "Savings / investments", estimate: state.savingsEstimate, actual: state.savingsActual },
    { name: "LTC insurance benefit", estimate: state.ltcEstimate, actual: state.ltcActual },
    { name: "Family contributions", estimate: state.familyEstimate, actual: state.familyActual },
    { name: "Other", estimate: state.otherEstimate, actual: state.otherActual },
  ];
  const totalAvailable = fundingRows.reduce((sum, r) => sum + r.estimate, 0);

  const surplus = totalAvailable - totalEstimatedCost;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>

      {/* Section 1: Cost categories */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Section 1: Transition costs</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Estimate all five categories. Fill in actuals as real numbers come in.
          </p>
        </div>

        <div className="space-y-4">
          <CostCategory
            title="1. Moving costs"
            help="Movers, packing, junk removal, storage."
          >
            <MoneyField
              label="Your estimate"
              value={state.movingEstimate}
              onChange={(v) => update("movingEstimate", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.movingActual}
              onChange={(v) => update("movingActual", v)}
            />
          </CostCategory>

          <CostCategory
            title="2. Home preparation"
            help="Repairs, paint, staging, anything to get the house sale-ready."
          >
            <MoneyField
              label="Your estimate"
              value={state.prepEstimate}
              onChange={(v) => update("prepEstimate", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.prepActual}
              onChange={(v) => update("prepActual", v)}
            />
          </CostCategory>

          <CostCategory
            title="3. Senior living costs"
            help="Entrance or community fee plus the first months at the new place."
          >
            <MoneyField
              label="Entrance or community fee"
              value={state.entranceFee}
              onChange={(v) => update("entranceFee", v)}
            />
            <MoneyField
              label="Monthly cost"
              value={state.monthlyFacility}
              onChange={(v) => update("monthlyFacility", v)}
            />
            <NumberField
              label="Early months to budget"
              suffix="months"
              value={state.earlyMonths}
              onChange={(v) => update("earlyMonths", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.seniorLivingActual}
              onChange={(v) => update("seniorLivingActual", v)}
            />
            <SubTotal label="Category estimate" value={seniorLivingEstimate} />
          </CostCategory>

          <CostCategory
            title="4. Legal and professional fees"
            help="Attorney, financial advisor, senior move manager, and similar."
          >
            <MoneyField
              label="Your estimate"
              value={state.legalEstimate}
              onChange={(v) => update("legalEstimate", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.legalActual}
              onChange={(v) => update("legalActual", v)}
            />
          </CostCategory>

          <CostCategory
            title="5. Overlap period"
            help="Carrying two households at once: the old home's mortgage, taxes, and utilities on top of the new place."
          >
            <NumberField
              label="Months of overlap"
              suffix="months"
              value={state.overlapMonths}
              onChange={(v) => update("overlapMonths", v)}
            />
            <MoneyField
              label="Monthly cost of both households"
              value={state.overlapMonthlyCost}
              onChange={(v) => update("overlapMonthlyCost", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.overlapActual}
              onChange={(v) => update("overlapActual", v)}
            />
            <SubTotal label="Category estimate" value={overlapEstimate} />
          </CostCategory>
        </div>

        <div className="rounded-md border-2 border-amber-400 bg-amber-50 p-4 text-sm text-neutral-800">
          <p className="font-semibold">Watch the overlap.</p>
          <p className="mt-1">
            The silent budget-killer is paying for two homes at once. Every month
            of overlap runs $3,000 to $8,000. Shrinking that window is the single
            biggest thing you can control.
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 p-6">
          <h4 className="text-base font-semibold">Grand total</h4>
          <dl className="mt-4 space-y-2 text-sm">
            {costRows.map((r) => (
              <Row key={r.name} label={r.name} value={fmtUsd(r.estimate)} />
            ))}
            <Row label="Total estimated cost" value={fmtUsd(totalEstimatedCost)} bold />
            {anyActualCosts ? (
              <Row label="Total actual so far" value={fmtUsd(totalActualCost)} />
            ) : null}
          </dl>
        </div>
      </section>

      {/* Section 2: Funding sources */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Section 2: Funding sources</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Where the money comes from to cover those costs.
          </p>
        </div>

        <div className="space-y-4">
          <CostCategory
            title="Home sale proceeds (after mortgage payoff)"
            help="We estimate this from your sale price, mortgage payoff, and agent commission."
          >
            <MoneyField
              label="Expected sale price"
              value={state.salePrice}
              onChange={(v) => update("salePrice", v)}
            />
            <MoneyField
              label="Mortgage payoff balance"
              value={state.mortgagePayoff}
              onChange={(v) => update("mortgagePayoff", v)}
            />
            <NumberField
              label="Agent commission"
              suffix="%"
              value={state.agentCommissionPct}
              onChange={(v) => update("agentCommissionPct", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.homeSaleActual}
              onChange={(v) => update("homeSaleActual", v)}
            />
            <SubTotal label="Estimated net proceeds" value={homeSaleProceeds} />
          </CostCategory>

          <CostCategory title="Savings / investments">
            <MoneyField
              label="Your estimate"
              value={state.savingsEstimate}
              onChange={(v) => update("savingsEstimate", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.savingsActual}
              onChange={(v) => update("savingsActual", v)}
            />
          </CostCategory>

          <CostCategory title="LTC insurance benefit">
            <MoneyField
              label="Your estimate"
              value={state.ltcEstimate}
              onChange={(v) => update("ltcEstimate", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.ltcActual}
              onChange={(v) => update("ltcActual", v)}
            />
          </CostCategory>

          <CostCategory title="Family contributions">
            <MoneyField
              label="Your estimate"
              value={state.familyEstimate}
              onChange={(v) => update("familyEstimate", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.familyActual}
              onChange={(v) => update("familyActual", v)}
            />
          </CostCategory>

          <CostCategory title="Other">
            <MoneyField
              label="Your estimate"
              value={state.otherEstimate}
              onChange={(v) => update("otherEstimate", v)}
            />
            <MoneyField
              label="Actual (optional)"
              value={state.otherActual}
              onChange={(v) => update("otherActual", v)}
            />
          </CostCategory>
        </div>

        <div className="rounded-lg border border-neutral-200 p-6">
          <h4 className="text-base font-semibold">Funding totals</h4>
          <dl className="mt-4 space-y-2 text-sm">
            {fundingRows.map((r) => (
              <Row key={r.name} label={r.name} value={fmtUsd(r.estimate)} />
            ))}
            <Row label="Total available" value={fmtUsd(totalAvailable)} bold />
          </dl>
        </div>
      </section>

      {/* Verdict */}
      <div
        className={
          "rounded-md border-2 p-4 " +
          (surplus >= 0
            ? "border-emerald-500 bg-emerald-50"
            : "border-red-500 bg-red-50")
        }
      >
        <p className="text-sm font-medium uppercase tracking-wide">
          {surplus >= 0 ? "Surplus" : "Shortfall"}
        </p>
        <p className="mt-1 text-3xl font-semibold">{fmtUsd(surplus)}</p>
        <p className="mt-2 text-xs text-neutral-600">
          Total available minus total estimated cost.
        </p>
        {surplus < 0 ? (
          <p className="mt-2 text-sm text-neutral-800">
            You have a gap to close. Review Module 9 (Home Sale Strategy) and
            consider talking to a financial advisor before you commit to a move.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CostCategory({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      {help ? <p className="mt-1 text-xs text-neutral-500">{help}</p> : null}
      <div className="mt-3 grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return <NumberField label={label} suffix="USD" value={value} onChange={onChange} />;
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-neutral-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
        {suffix ? <span className="text-xs text-neutral-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SubTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm md:col-span-2">
      <span className="text-neutral-700">{label}</span>
      <span className="font-semibold text-neutral-900">{fmtUsd(value)}</span>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-700">{label}</dt>
      <dd className={bold ? "font-semibold text-neutral-900" : "text-neutral-900"}>{value}</dd>
    </div>
  );
}
