"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

type State = {
  // Aging at home
  modificationsOneTime: number;
  caregiverHourly: number;
  caregiverHoursPerWeek: number;
  homeMaintenanceMonthly: number;
  medicalMonthly: number;
  // Assisted living
  alMonthly: number;
  alIncidentalsAnnual: number;
  // Years
  years: number;
};

const DEFAULTS: State = {
  modificationsOneTime: 15000,
  caregiverHourly: 28,
  caregiverHoursPerWeek: 20,
  homeMaintenanceMonthly: 400,
  medicalMonthly: 300,
  alMonthly: 5500,
  alIncidentalsAnnual: 3000,
  years: 5,
};

const HOME_FIELDS: Array<{ key: keyof State; label: string; suffix?: string }> = [
  { key: "modificationsOneTime", label: "Home modifications (one-time)", suffix: "USD" },
  { key: "caregiverHourly", label: "Caregiver rate", suffix: "USD/hr" },
  { key: "caregiverHoursPerWeek", label: "Caregiver hours per week", suffix: "hrs/wk" },
  { key: "homeMaintenanceMonthly", label: "Home maintenance (monthly)", suffix: "USD" },
  { key: "medicalMonthly", label: "Medical / supplies (monthly)", suffix: "USD" },
];

const AL_FIELDS: Array<{ key: keyof State; label: string; suffix?: string }> = [
  { key: "alMonthly", label: "Assisted living (monthly)", suffix: "USD" },
  { key: "alIncidentalsAnnual", label: "Annual incidentals", suffix: "USD" },
];

export function AgingCostCalculator() {
  const [state, setState, status] = useToolState<State>("tool-14a", DEFAULTS);

  const update = (key: keyof State, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const homeAnnual =
    state.caregiverHourly * state.caregiverHoursPerWeek * 52 +
    (state.homeMaintenanceMonthly + state.medicalMonthly) * 12;
  const homeYears = (n: number) => state.modificationsOneTime + homeAnnual * n;

  const alAnnual = state.alMonthly * 12 + state.alIncidentalsAnnual;
  const alYears = (n: number) => alAnnual * n;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="text-lg font-semibold">Aging at home</h3>
          <div className="mt-4 space-y-3">
            {HOME_FIELDS.map((f) => (
              <NumberField
                key={f.key}
                label={f.label}
                value={state[f.key] as number}
                suffix={f.suffix}
                onChange={(v) => update(f.key, v)}
              />
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-lg font-semibold">Assisted living</h3>
          <div className="mt-4 space-y-3">
            {AL_FIELDS.map((f) => (
              <NumberField
                key={f.key}
                label={f.label}
                value={state[f.key] as number}
                suffix={f.suffix}
                onChange={(v) => update(f.key, v)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold">Year-by-year comparison</h3>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="py-2 text-left font-medium">Year</th>
              <th className="py-2 text-right font-medium">Aging at home</th>
              <th className="py-2 text-right font-medium">Assisted living</th>
              <th className="py-2 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(Math.max(state.years, 1), 10) }, (_, i) => i + 1).map(
              (y) => {
                const h = homeYears(y);
                const a = alYears(y);
                const d = h - a;
                return (
                  <tr key={y} className="border-b border-neutral-100">
                    <td className="py-2">Year {y}</td>
                    <td className="py-2 text-right">{fmtUsd(h)}</td>
                    <td className="py-2 text-right">{fmtUsd(a)}</td>
                    <td className={"py-2 text-right " + (d < 0 ? "text-emerald-700" : "text-red-700")}>
                      {d > 0 ? "+" : ""}
                      {fmtUsd(d)}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <span className="font-medium">Years to project:</span>
          <input
            type="number"
            min={1}
            max={10}
            value={state.years}
            onChange={(e) => update("years", Number(e.target.value) || 1)}
            className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-right"
          />
        </label>
        <p className="mt-3 text-xs text-neutral-500">
          A negative difference means home is cheaper that year. A positive difference means
          assisted living is cheaper.
        </p>
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
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
