"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

type State = {
  salePrice: number;
  mortgagePayoff: number;
  agentCommissionPct: number;
  sellerClosingPct: number;
  repairCredits: number;
  prepCost: number;
  otherCosts: number;
};

const DEFAULTS: State = {
  salePrice: 350000,
  mortgagePayoff: 0,
  agentCommissionPct: 6,
  sellerClosingPct: 1,
  repairCredits: 0,
  prepCost: 0,
  otherCosts: 0,
};

const FIELDS: Array<{ key: keyof State; label: string; suffix?: string }> = [
  { key: "salePrice", label: "Sale price", suffix: "USD" },
  { key: "mortgagePayoff", label: "Mortgage payoff", suffix: "USD" },
  { key: "agentCommissionPct", label: "Agent commission", suffix: "%" },
  { key: "sellerClosingPct", label: "Seller closing costs", suffix: "%" },
  { key: "repairCredits", label: "Repair credits to buyer", suffix: "USD" },
  { key: "prepCost", label: "Pre-listing prep cost", suffix: "USD" },
  { key: "otherCosts", label: "Other costs (HOA dues, attorney)", suffix: "USD" },
];

export function NetProceeds() {
  const [state, setState, status] = useToolState<State>("tool-09a", DEFAULTS);

  const update = (key: keyof State, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const commission = state.salePrice * (state.agentCommissionPct / 100);
  const closing = state.salePrice * (state.sellerClosingPct / 100);
  const totalOff =
    state.mortgagePayoff +
    commission +
    closing +
    state.repairCredits +
    state.prepCost +
    state.otherCosts;
  const net = state.salePrice - totalOff;

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
        <h3 className="text-lg font-semibold">Breakdown</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Sale price" value={fmtUsd(state.salePrice)} />
          <Row label="Mortgage payoff" value={`-${fmtUsd(state.mortgagePayoff)}`} />
          <Row label={`Agent commission (${state.agentCommissionPct}%)`} value={`-${fmtUsd(commission)}`} />
          <Row label={`Closing costs (${state.sellerClosingPct}%)`} value={`-${fmtUsd(closing)}`} />
          <Row label="Repair credits" value={`-${fmtUsd(state.repairCredits)}`} />
          <Row label="Prep cost" value={`-${fmtUsd(state.prepCost)}`} />
          <Row label="Other" value={`-${fmtUsd(state.otherCosts)}`} />
        </dl>
        <div className="mt-6 rounded-md border-2 border-emerald-500 bg-emerald-50 p-4">
          <p className="text-sm font-medium uppercase tracking-wide">Net proceeds</p>
          <p className="mt-1 text-3xl font-semibold">{fmtUsd(net)}</p>
          <p className="mt-2 text-xs text-neutral-600">
            What your family actually walks away with at closing.
          </p>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-700">{label}</dt>
      <dd className="text-neutral-900">{value}</dd>
    </div>
  );
}
