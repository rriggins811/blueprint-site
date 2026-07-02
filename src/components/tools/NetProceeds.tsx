"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

type State = {
  marketValue: number;
  mortgagePayoff: number;
  // Path A: traditional MLS listing
  expectedSalePrice: number;
  agentCommissionPct: number;
  repairsUpdates: number;
  staging: number;
  closingCostsTraditional: number;
  carryingMonths: number;
  carryingMonthly: number;
  // Path B: as-is cash offer
  cashOfferPrice: number;
  closingCostsCash: number;
};

const DEFAULTS: State = {
  marketValue: 350000,
  mortgagePayoff: 0,
  expectedSalePrice: 350000,
  agentCommissionPct: 6,
  repairsUpdates: 0,
  staging: 0,
  closingCostsTraditional: 0,
  carryingMonths: 3,
  carryingMonthly: 0,
  cashOfferPrice: 262500,
  closingCostsCash: 1000,
};

type FieldDef = {
  key: keyof State;
  label: string;
  suffix?: string;
  helper?: string;
};

const PATH_A_FIELDS: FieldDef[] = [
  { key: "expectedSalePrice", label: "Expected sale price", suffix: "USD" },
  {
    key: "agentCommissionPct",
    label: "Agent commission",
    suffix: "%",
    helper: "Typically 5-6%.",
  },
  { key: "repairsUpdates", label: "Repairs and updates", suffix: "USD" },
  { key: "staging", label: "Staging", suffix: "USD" },
  { key: "closingCostsTraditional", label: "Closing costs", suffix: "USD" },
  {
    key: "carryingMonths",
    label: "Months on the market",
    suffix: "months",
    helper: "How long you expect to carry the house before closing.",
  },
  {
    key: "carryingMonthly",
    label: "Monthly carrying cost",
    suffix: "USD",
    helper: "Mortgage payment, taxes, insurance, utilities per month.",
  },
  { key: "mortgagePayoff", label: "Mortgage payoff", suffix: "USD" },
];

const PATH_B_FIELDS: FieldDef[] = [
  {
    key: "cashOfferPrice",
    label: "Cash offer price",
    suffix: "USD",
    helper: "Typically 70-85% of market value.",
  },
  {
    key: "closingCostsCash",
    label: "Closing costs",
    suffix: "USD",
    helper: "Usually $500 to $1,500.",
  },
  { key: "mortgagePayoff", label: "Mortgage payoff", suffix: "USD" },
];

export function NetProceeds() {
  const [state, setState, status] = useToolState<State>("tool-09a-v2", DEFAULTS);

  const update = (key: keyof State, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const commission = state.expectedSalePrice * (state.agentCommissionPct / 100);
  const carrying = state.carryingMonths * state.carryingMonthly;
  const netTraditional =
    state.expectedSalePrice -
    commission -
    state.repairsUpdates -
    state.staging -
    state.closingCostsTraditional -
    carrying -
    state.mortgagePayoff;

  const netCash =
    state.cashOfferPrice - state.closingCostsCash - state.mortgagePayoff;

  const difference = netTraditional - netCash;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>

      <p className="text-sm text-neutral-700">
        The cash offer is built to look easy. Run your real numbers here before
        anyone talks you into fast and cheap. Same house, two paths, and the
        difference is usually not close.
      </p>

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          def={{
            key: "marketValue",
            label: "Estimated market value",
            suffix: "USD",
            helper: "What it's really worth fixed up.",
          }}
          value={state.marketValue}
          onChange={update}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold">Path A: Traditional MLS listing</h3>
          <div className="mt-4 grid gap-4">
            {PATH_A_FIELDS.map((f) => (
              <Field key={f.key} def={f} value={state[f.key]} onChange={update} />
            ))}
          </div>
          <dl className="mt-6 space-y-2 border-t border-neutral-200 pt-4 text-sm">
            <Row label="Expected sale price" value={fmtUsd(state.expectedSalePrice)} />
            <Row
              label={`Agent commission (${state.agentCommissionPct}%)`}
              value={`-${fmtUsd(commission)}`}
            />
            <Row label="Repairs and updates" value={`-${fmtUsd(state.repairsUpdates)}`} />
            <Row label="Staging" value={`-${fmtUsd(state.staging)}`} />
            <Row label="Closing costs" value={`-${fmtUsd(state.closingCostsTraditional)}`} />
            <Row
              label={`Carrying costs (${state.carryingMonths} mo x ${fmtUsd(state.carryingMonthly)})`}
              value={`-${fmtUsd(carrying)}`}
            />
            <Row label="Mortgage payoff" value={`-${fmtUsd(state.mortgagePayoff)}`} />
          </dl>
          <div className="mt-4 rounded-md bg-neutral-100 p-4">
            <p className="text-sm font-medium uppercase tracking-wide">
              Net proceeds, traditional
            </p>
            <p className="mt-1 text-2xl font-semibold">{fmtUsd(netTraditional)}</p>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold">Path B: As-is cash offer</h3>
          <div className="mt-4 grid gap-4">
            {PATH_B_FIELDS.map((f) => (
              <Field key={f.key} def={f} value={state[f.key]} onChange={update} />
            ))}
          </div>
          <dl className="mt-6 space-y-2 border-t border-neutral-200 pt-4 text-sm">
            <Row label="Cash offer price" value={fmtUsd(state.cashOfferPrice)} />
            <Row label="Closing costs" value={`-${fmtUsd(state.closingCostsCash)}`} />
            <Row label="Mortgage payoff" value={`-${fmtUsd(state.mortgagePayoff)}`} />
          </dl>
          <div className="mt-4 rounded-md bg-neutral-100 p-4">
            <p className="text-sm font-medium uppercase tracking-wide">
              Net proceeds, cash
            </p>
            <p className="mt-1 text-2xl font-semibold">{fmtUsd(netCash)}</p>
          </div>
        </section>
      </div>

      <section className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-6">
        <h3 className="text-lg font-semibold">The difference</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Traditional net" value={fmtUsd(netTraditional)} />
          <Row label="Cash net" value={fmtUsd(netCash)} />
        </dl>
        <div className="mt-4">
          <p className="text-sm font-medium uppercase tracking-wide">
            What the traditional path keeps in your family&apos;s pocket
          </p>
          <p className="mt-1 text-3xl font-semibold">{fmtUsd(difference)}</p>
        </div>
        <p className="mt-4 text-sm text-neutral-700">
          Read your own numbers. Even after commission, repairs, and a few months
          of carrying costs, the traditional path usually nets tens of thousands
          more, sometimes close to a hundred grand on a normal house. A real cash
          sale has its place, like a true teardown or a genuine time crunch. But
          make it a choice you made with the numbers in front of you, not a
          reflex because a postcard showed up.
        </p>
      </section>
    </div>
  );
}

function Field({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: number;
  onChange: (key: keyof State, value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-neutral-700">{def.label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(def.key, Number(e.target.value) || 0)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
        {def.suffix ? (
          <span className="text-xs text-neutral-500">{def.suffix}</span>
        ) : null}
      </div>
      {def.helper ? (
        <span className="text-xs text-neutral-500">{def.helper}</span>
      ) : null}
    </label>
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
