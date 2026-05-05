"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator } from "./SaveIndicator";

type FacilityScores = { name: string; scores: Record<string, number> };
type State = { facilities: FacilityScores[] };

const CRITERIA: Array<{ key: string; label: string }> = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "staff", label: "Staff friendliness and attentiveness" },
  { key: "engagement", label: "Resident engagement and atmosphere" },
  { key: "food", label: "Food quality" },
  { key: "activities", label: "Activities and programs" },
  { key: "safety", label: "Safety and accessibility" },
  { key: "location", label: "Location for the family" },
  { key: "value", label: "Price-to-value" },
];

const RATINGS = [1, 2, 3, 4, 5];

function avg(scores: Record<string, number>): number {
  const vals = CRITERIA.map((c) => scores[c.key] ?? 0).filter((v) => v > 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function ComparisonScorecard() {
  const [state, setState, status] = useToolState<State>("tool-07d", {
    facilities: [
      { name: "Facility A", scores: {} },
      { name: "Facility B", scores: {} },
      { name: "Facility C", scores: {} },
    ],
  });

  const setName = (idx: number, name: string) => {
    setState((prev) => {
      const next = prev.facilities.map((f, i) => (i === idx ? { ...f, name } : f));
      return { facilities: next };
    });
  };

  const setScore = (idx: number, criterion: string, value: number) => {
    setState((prev) => {
      const next = prev.facilities.map((f, i) =>
        i === idx ? { ...f, scores: { ...f.scores, [criterion]: value } } : f
      );
      return { facilities: next };
    });
  };

  const winner = state.facilities.reduce<{ idx: number; score: number } | null>(
    (best, f, i) => {
      const a = avg(f.scores);
      if (!best || a > best.score) return { idx: i, score: a };
      return best;
    },
    null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
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
              <td className="p-2">Average</td>
              {state.facilities.map((f, i) => (
                <td key={i} className="p-2 text-lg">
                  {avg(f.scores) ? avg(f.scores).toFixed(2) : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {winner && winner.score > 0 ? (
        <aside className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-900">
          Highest scorer right now: <strong>{state.facilities[winner.idx].name}</strong> at{" "}
          <strong>{winner.score.toFixed(2)}</strong>.
        </aside>
      ) : null}
    </div>
  );
}
