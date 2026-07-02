"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator } from "./SaveIndicator";

type CommunityEntry = {
  name: string;
  scores: Record<string, number>;
  monthlyCost?: number;
  medicaid?: string;
  redFlags?: number;
  preference?: string;
  contractReviewed?: string;
};
type State = { facilities: CommunityEntry[]; recommendation?: string };

const CRITERIA: Array<{ key: string; label: string }> = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "staff", label: "Staff friendliness and attentiveness" },
  { key: "engagement", label: "Resident engagement and atmosphere" },
  { key: "food", label: "Food quality" },
  { key: "activities", label: "Activities and programs" },
  { key: "safety", label: "Safety and accessibility" },
  { key: "location", label: "Location for the family" },
  { key: "apartment", label: "Apartment size and condition" },
  { key: "transparency", label: "Transparency (straight answers to your questions)" },
  { key: "value", label: "Price-to-value" },
];

const RATINGS = [1, 2, 3, 4, 5];
const MAX_TOTAL = CRITERIA.length * 5;

function totalOf(scores: Record<string, number>): number {
  return CRITERIA.reduce((sum, c) => sum + (scores[c.key] ?? 0), 0);
}

export function ComparisonScorecard() {
  const [state, setState, status] = useToolState<State>("tool-07d", {
    facilities: [
      { name: "Community A", scores: {} },
      { name: "Community B", scores: {} },
      { name: "Community C", scores: {} },
    ],
  });

  const setName = (idx: number, name: string) => {
    setState((prev) => ({
      ...prev,
      facilities: prev.facilities.map((f, i) => (i === idx ? { ...f, name } : f)),
    }));
  };

  const setScore = (idx: number, criterion: string, value: number) => {
    setState((prev) => ({
      ...prev,
      facilities: prev.facilities.map((f, i) =>
        i === idx ? { ...f, scores: { ...f.scores, [criterion]: value } } : f
      ),
    }));
  };

  const setField = (
    idx: number,
    field: "monthlyCost" | "medicaid" | "redFlags" | "preference" | "contractReviewed",
    value: string | number | undefined
  ) => {
    setState((prev) => ({
      ...prev,
      facilities: prev.facilities.map((f, i) =>
        i === idx ? { ...f, [field]: value } : f
      ),
    }));
  };

  const setRecommendation = (recommendation: string) => {
    setState((prev) => ({ ...prev, recommendation }));
  };

  const winner = state.facilities.reduce<{ idx: number; score: number } | null>(
    (best, f, i) => {
      const t = totalOf(f.scores);
      if (!best || t > best.score) return { idx: i, score: t };
      return best;
    },
    null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          Score each community 1 to 5 while the tour is fresh. The numbers cut
          through a pretty lobby and a good sales pitch.
        </p>
        <SaveIndicator status={status} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-neutral-300 p-2 text-left font-medium">Criterion</th>
              {state.facilities.map((f, i) => (
                <th key={i} className="border-b border-neutral-300 p-2 text-left">
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => setName(i, e.target.value)}
                    className="w-full border-b border-neutral-200 pb-1 font-semibold focus:outline-none"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map((c) => (
              <tr key={c.key}>
                <td className="border-b border-neutral-100 p-2 align-top">{c.label}</td>
                {state.facilities.map((f, i) => (
                  <td key={i} className="border-b border-neutral-100 p-2">
                    <div className="flex gap-1">
                      {RATINGS.map((r) => {
                        const selected = f.scores[c.key] === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setScore(i, c.key, r)}
                            className={
                              "h-8 w-8 rounded text-sm font-medium transition " +
                              (selected
                                ? "bg-amber-600 text-white"
                                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200")
                            }
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="p-2">Total (out of {MAX_TOTAL})</td>
              {state.facilities.map((f, i) => (
                <td key={i} className="p-2 text-lg">
                  {totalOf(f.scores) > 0 ? totalOf(f.scores) : "0"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {winner && winner.score > 0 ? (
        <aside className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-900">
          Highest scorer right now: <strong>{state.facilities[winner.idx].name}</strong> at{" "}
          <strong>
            {winner.score} of {MAX_TOTAL}
          </strong>
          .
        </aside>
      ) : null}

      <section>
        <h3 className="text-base font-semibold text-neutral-900">Also compare</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-neutral-300 p-2 text-left font-medium">Factor</th>
                {state.facilities.map((f, i) => (
                  <th key={i} className="border-b border-neutral-300 p-2 text-left font-semibold">
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-neutral-100 p-2 align-top">Total monthly cost</td>
                {state.facilities.map((f, i) => (
                  <td key={i} className="border-b border-neutral-100 p-2">
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-500">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={f.monthlyCost ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setField(
                            i,
                            "monthlyCost",
                            e.target.value === "" ? undefined : Number(e.target.value) || 0
                          )
                        }
                        className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-right"
                      />
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-neutral-100 p-2 align-top">Accepts Medicaid?</td>
                {state.facilities.map((f, i) => (
                  <td key={i} className="border-b border-neutral-100 p-2">
                    <select
                      value={f.medicaid ?? ""}
                      onChange={(e) => setField(i, "medicaid", e.target.value || undefined)}
                      className="rounded-md border border-neutral-300 px-2 py-1"
                    >
                      <option value="">Pick one</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="unsure">Unsure</option>
                    </select>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-neutral-100 p-2 align-top">Red flags count</td>
                {state.facilities.map((f, i) => (
                  <td key={i} className="border-b border-neutral-100 p-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={f.redFlags ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        setField(
                          i,
                          "redFlags",
                          e.target.value === "" ? undefined : Number(e.target.value) || 0
                        )
                      }
                      className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-right"
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-neutral-100 p-2 align-top">Senior&apos;s preference</td>
                {state.facilities.map((f, i) => (
                  <td key={i} className="border-b border-neutral-100 p-2">
                    <input
                      type="text"
                      value={f.preference ?? ""}
                      placeholder="Their take"
                      onChange={(e) => setField(i, "preference", e.target.value || undefined)}
                      className="w-full rounded-md border border-neutral-300 px-2 py-1"
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b border-neutral-100 p-2 align-top">Contract reviewed?</td>
                {state.facilities.map((f, i) => (
                  <td key={i} className="border-b border-neutral-100 p-2">
                    <select
                      value={f.contractReviewed ?? ""}
                      onChange={(e) =>
                        setField(i, "contractReviewed", e.target.value || undefined)
                      }
                      className="rounded-md border border-neutral-300 px-2 py-1"
                    >
                      <option value="">Pick one</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 p-5">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-neutral-700">
            Recommendation: top choice, and why
          </span>
          <textarea
            value={state.recommendation ?? ""}
            placeholder="Which community wins, and what tipped the decision?"
            onChange={(e) => setRecommendation(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
      </section>

      <aside className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Eat a meal at each one.</strong> The food tells you more about
        how a place treats residents than any brochure. And weight resident
        happiness and staff friendliness highest, those are what your parent
        lives with every single day, long after the tour is over.
      </aside>
    </div>
  );
}
