"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

type Facility = {
  name: string;
  baseRent: number;
  careLevel: number;
  meals: number;
  medical: number;
  laundry: number;
  transportation: number;
  other: number;
};

type State = { a: Facility; b: Facility };

const EMPTY: Facility = {
  name: "",
  baseRent: 0,
  careLevel: 0,
  meals: 0,
  medical: 0,
  laundry: 0,
  transportation: 0,
  other: 0,
};

const FIELDS: Array<{ key: keyof Facility; label: string }> = [
  { key: "baseRent", label: "Base monthly rent" },
  { key: "careLevel", label: "Care level fee" },
  { key: "meals", label: "Meals & dining" },
  { key: "medical", label: "Medical / nursing" },
  { key: "laundry", label: "Laundry / housekeeping" },
  { key: "transportation", label: "Transportation" },
  { key: "other", label: "Other (cable, phone, etc.)" },
];

function totalFor(f: Facility): number {
  return FIELDS.reduce((sum, fld) => sum + (Number(f[fld.key]) || 0), 0);
}

export function MonthlyCostComparison() {
  const [state, setState, status] = useToolState<State>("tool-07a", {
    a: { ...EMPTY, name: "Facility A" },
    b: { ...EMPTY, name: "Facility B" },
  });

  const update = (which: "a" | "b", key: keyof Facility, value: string | number) => {
    setState((prev) => ({
      ...prev,
      [which]: { ...prev[which], [key]: value },
    }));
  };

  const totalA = totalFor(state.a);
  const totalB = totalFor(state.b);
  const diff = totalA - totalB;
  const annualDiff = diff * 12;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(["a", "b"] as const).map((which) => (
          <div key={which} className="rounded-lg border border-neutral-200 p-5">
            <input
              type="text"
              value={state[which].name}
              onChange={(e) => update(which, "name", e.target.value)}
              className="w-full border-b border-neutral-300 pb-1 text-lg font-semibold"
              placeholder={`Facility ${which.toUpperCase()}`}
            />
            <div className="mt-4 space-y-2">
              {FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-neutral-700">{f.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={state[which][f.key] as number}
                    onChange={(e) =>
                      update(which, f.key, Number(e.target.value) || 0)
                    }
                    className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-right"
                  />
                </label>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3">
                <span className="text-sm font-semibold">Monthly total</span>
                <span className="text-lg font-semibold">
                  {fmtUsd(totalFor(state[which]))}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <section className="rounded-lg border-2 border-neutral-300 p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Comparison
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {diff === 0
            ? "Same monthly cost"
            : diff > 0
            ? `${state.a.name || "Facility A"} costs ${fmtUsd(diff)} more per month`
            : `${state.b.name || "Facility B"} costs ${fmtUsd(-diff)} more per month`}
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          That is {fmtUsd(Math.abs(annualDiff))} per year.
        </p>
      </section>
    </div>
  );
}
