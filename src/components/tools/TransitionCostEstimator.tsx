"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

type State = {
  entranceFee: number;
  monthlyFacility: number;
  monthsExpected: number;
  prepCost: number;
  movingCost: number;
  salePrice: number;
  mortgagePayoff: number;
  agentCommissionPct: number;
  closingCostsPct: number;
};

const DEFAULTS: State = {
  entranceFee: 5000,
  monthlyFacility: 5500,
  monthsExpected: 24,
  prepCost: 8000,
  movingCost: 3500,
  salePrice: 350000,
  mortgagePayoff: 0,
  agentCommissionPct: 6,
  closingCostsPct: 1,
};

const FIELDS: Array<{ key: keyof State; label: string; suffix?: string; help?: string }> = [
  { key: "entranceFee", label: "Facility entrance or community fee", suffix: "USD" },
  { key: "monthlyFacility", label: "Monthly facility cost", suffix: "USD" },
  { key: "monthsExpected", label: "Months expected at this facility", suffix: "months" },
  { key: "prepCost", label: "Home prep and repair costs", suffix: "USD" },
  { key: "movingCost", label: "Moving cost", suffix: "USD" },
  { key: "salePrice", label: "Expected home sale price", suffix: "USD" },
  { key: "mortgagePayoff", label: "Mortgage payoff balance", suffix: "USD" },
  { key: "agentCommissionPct", label: "Agent commission", suffix: "%" },
  { key: "closingCostsPct", label: "Seller closing costs", suffix: "%" },
];

export function TransitionCostEstimator() {
  const [state, setState, status] = useToolState<State>("tool-06d", DEFAULTS);

  const update = (key: keyof State, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const totalFacility = state.entranceFee + state.monthlyFacility * state.monthsExpected;
  const movePrep = state.prepCost + state.movingCost;
  const grossSale = state.salePrice;
  const commission = grossSale * (state.agentCommissionPct / 100);
  const closing = grossSale * (state.closingCostsPct / 100);
  const netSale = grossSale - state.mortgagePayoff - commission - closing;
  const totalOutflow = totalFacility + movePrep;
  const netResult = netSale - totalOutflow;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">{f.label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={state[f.key]}
                onChange={(e) => update(f.key, Number(e.target.value) || 0)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              />
              {f.suffix ? (
                <span className="text-xs text-neutral-500">{f.suffix}</span>
              ) : null}
            </div>
          </label>
        ))}
      </section>

      <section className="rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold">Estimate</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Total facility cost (entrance + monthly × months)" value={fmtUsd(totalFacility)} />
          <Row label="Move and prep" value={fmtUsd(movePrep)} />
          <Row label="Gross sale price" value={fmtUsd(grossSale)} />
          <Row label="Agent commission" value={`-${fmtUsd(commission)}`} />
          <Row label="Closing costs" value={`-${fmtUsd(closing)}`} />
          <Row label="Mortgage payoff" value={`-${fmtUsd(state.mortgagePayoff)}`} />
          <Row label="Net from home sale" value={fmtUsd(netSale)} bold />
        </dl>
        <div
          className={
            "mt-6 rounded-md border-2 p-4 " +
            (netResult >= 0
              ? "border-emerald-500 bg-emerald-50"
              : "border-red-500 bg-red-50")
          }
        >
          <p className="text-sm font-medium uppercase tracking-wide">
            {netResult >= 0 ? "Net surplus after transition" : "Net shortfall after transition"}
          </p>
          <p className="mt-1 text-3xl font-semibold">{fmtUsd(netResult)}</p>
          <p className="mt-2 text-xs text-neutral-600">
            Sale proceeds minus total facility cost minus move and prep.
          </p>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-700">{label}</dt>
      <dd className={bold ? "font-semibold text-neutral-900" : "text-neutral-900"}>{value}</dd>
    </div>
  );
}
