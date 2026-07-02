"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator, fmtUsd } from "./SaveIndicator";

type State = {
  // Aging in place, monthly
  mortgageRentMonthly: number;
  propertyTaxMonthly: number;
  homeInsuranceMonthly: number;
  utilitiesMonthly: number;
  homeMaintenanceMonthly: number;
  transportationMonthly: number;
  foodMonthly: number;
  otherHomeMonthly: number;
  // Aging in place, one-time and care
  modificationsOneTime: number;
  caregiverHourly: number;
  caregiverHoursPerWeek: number;
  // Senior living, monthly
  slRentMonthly: number;
  slPersonalCareMonthly: number;
  slMedicationMonthly: number;
  slOtherMonthly: number;
  // Senior living, one-time
  slMoveInOneTime: number;
  // Years
  years: number;
};

const DEFAULTS: State = {
  mortgageRentMonthly: 1400,
  propertyTaxMonthly: 250,
  homeInsuranceMonthly: 150,
  utilitiesMonthly: 350,
  homeMaintenanceMonthly: 400,
  transportationMonthly: 250,
  foodMonthly: 600,
  otherHomeMonthly: 300,
  modificationsOneTime: 15000,
  caregiverHourly: 28,
  caregiverHoursPerWeek: 20,
  slRentMonthly: 5500,
  slPersonalCareMonthly: 1200,
  slMedicationMonthly: 500,
  slOtherMonthly: 300,
  slMoveInOneTime: 3500,
  years: 5,
};

const HOME_MONTHLY_FIELDS: Array<{ key: keyof State; label: string; suffix?: string }> = [
  { key: "mortgageRentMonthly", label: "Mortgage / rent (monthly)", suffix: "USD" },
  { key: "propertyTaxMonthly", label: "Property tax (monthly)", suffix: "USD" },
  { key: "homeInsuranceMonthly", label: "Homeowners insurance (monthly)", suffix: "USD" },
  { key: "utilitiesMonthly", label: "Utilities (monthly)", suffix: "USD" },
  { key: "homeMaintenanceMonthly", label: "Home maintenance / repairs (monthly)", suffix: "USD" },
  { key: "transportationMonthly", label: "Transportation (monthly)", suffix: "USD" },
  { key: "foodMonthly", label: "Food / groceries (monthly)", suffix: "USD" },
  { key: "otherHomeMonthly", label: "Other (medical, supplies, misc)", suffix: "USD" },
];

const HOME_OTHER_FIELDS: Array<{ key: keyof State; label: string; suffix?: string }> = [
  { key: "caregiverHourly", label: "In-home care rate", suffix: "USD/hr" },
  { key: "caregiverHoursPerWeek", label: "In-home care hours per week", suffix: "hrs/wk" },
  { key: "modificationsOneTime", label: "Home modifications (one-time)", suffix: "USD" },
];

const SL_MONTHLY_FIELDS: Array<{ key: keyof State; label: string; suffix?: string }> = [
  { key: "slRentMonthly", label: "Monthly rent / fee", suffix: "USD" },
  { key: "slPersonalCareMonthly", label: "Personal care add-ons (monthly)", suffix: "USD" },
  { key: "slMedicationMonthly", label: "Medication management (monthly)", suffix: "USD" },
  { key: "slOtherMonthly", label: "Other add-ons (monthly)", suffix: "USD" },
];

export function AgingCostCalculator() {
  const [state, setState, status] = useToolState<State>("tool-14a-v2", DEFAULTS);

  const update = (key: keyof State, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const years = Math.min(Math.max(state.years, 1), 10);

  // In-home care: hourly x hours/week, converted to a monthly figure.
  const careMonthly = (state.caregiverHourly * state.caregiverHoursPerWeek * 52) / 12;

  // Aging in place monthly total, before the one-time modifications.
  const homeMonthly =
    state.mortgageRentMonthly +
    state.propertyTaxMonthly +
    state.homeInsuranceMonthly +
    state.utilitiesMonthly +
    state.homeMaintenanceMonthly +
    state.transportationMonthly +
    state.foodMonthly +
    state.otherHomeMonthly +
    careMonthly;

  // Modifications amortized across the projection window, for the monthly view.
  const modsAmortizedMonthly = state.modificationsOneTime / (years * 12);
  const homeMonthlyWithMods = homeMonthly + modsAmortizedMonthly;

  // Multi-year totals count the one-time costs in full.
  const homeYears = (n: number) => state.modificationsOneTime + homeMonthly * 12 * n;

  const slMonthly =
    state.slRentMonthly +
    state.slPersonalCareMonthly +
    state.slMedicationMonthly +
    state.slOtherMonthly;
  const slYears = (n: number) => state.slMoveInOneTime + slMonthly * 12 * n;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="text-lg font-semibold">Aging in place</h3>
          <div className="mt-4 space-y-3">
            {HOME_MONTHLY_FIELDS.map((f) => (
              <NumberField
                key={f.key}
                label={f.label}
                value={state[f.key] as number}
                suffix={f.suffix}
                onChange={(v) => update(f.key, v)}
              />
            ))}
            {HOME_OTHER_FIELDS.map((f) => (
              <NumberField
                key={f.key}
                label={f.label}
                value={state[f.key] as number}
                suffix={f.suffix}
                onChange={(v) => update(f.key, v)}
              />
            ))}
          </div>
          <div className="mt-4 rounded-md bg-neutral-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">In-home care (monthly)</span>
              <span className="font-medium">{fmtUsd(careMonthly)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-neutral-600">
                Modifications spread over {years} {years === 1 ? "year" : "years"}
              </span>
              <span className="font-medium">{fmtUsd(modsAmortizedMonthly)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2">
              <span className="font-semibold">Total monthly</span>
              <span className="font-semibold">{fmtUsd(homeMonthlyWithMods)}</span>
            </div>
          </div>
        </section>
        <section>
          <h3 className="text-lg font-semibold">Senior living</h3>
          <div className="mt-4 space-y-3">
            {SL_MONTHLY_FIELDS.map((f) => (
              <NumberField
                key={f.key}
                label={f.label}
                value={state[f.key] as number}
                suffix={f.suffix}
                onChange={(v) => update(f.key, v)}
              />
            ))}
            <NumberField
              label="Move-in costs (one-time)"
              value={state.slMoveInOneTime}
              suffix="USD"
              onChange={(v) => update("slMoveInOneTime", v)}
            />
          </div>
          <div className="mt-4 rounded-md bg-neutral-50 p-3 text-sm">
            <div className="flex justify-between border-t border-transparent">
              <span className="font-semibold">Total monthly</span>
              <span className="font-semibold">{fmtUsd(slMonthly)}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Move-in costs are counted once in the multi-year totals below.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold">Year-by-year comparison</h3>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="py-2 text-left font-medium">Year</th>
              <th className="py-2 text-right font-medium">Aging in place</th>
              <th className="py-2 text-right font-medium">Senior living</th>
              <th className="py-2 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: years }, (_, i) => i + 1).map((y) => {
              const h = homeYears(y);
              const a = slYears(y);
              const d = h - a;
              const isFive = y === 5;
              return (
                <tr
                  key={y}
                  className={
                    "border-b border-neutral-100" +
                    (isFive ? " bg-amber-50 font-semibold" : "")
                  }
                >
                  <td className="py-2">
                    Year {y}
                    {isFive ? " (the 5-year number)" : ""}
                  </td>
                  <td className="py-2 text-right">{fmtUsd(h)}</td>
                  <td className="py-2 text-right">{fmtUsd(a)}</td>
                  <td className={"py-2 text-right " + (d < 0 ? "text-emerald-700" : "text-red-700")}>
                    {d > 0 ? "+" : ""}
                    {fmtUsd(d)}
                  </td>
                </tr>
              );
            })}
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
          A negative difference means staying home is cheaper that year. A positive difference
          means senior living is cheaper. Totals include one-time costs: home modifications on
          the aging-in-place side, move-in costs on the senior living side.
        </p>
      </section>

      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-neutral-800">
        <p>
          <strong>The number that surprises everyone.</strong> Add up modifications, in-home
          care, and the ongoing cost of the house, and aging in place can run $8,000 to $10,000
          a month, often more than assisted living with care included. Aging in place can be the
          right call, just make it with the real 5-year total in front of you, not the
          assumption that home is automatically cheaper.
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
