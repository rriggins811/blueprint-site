"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator } from "./SaveIndicator";

type State = { answers: Record<string, number> };

type Question = { id: string; q: string; choices: { label: string; score: number }[] };

const QUESTIONS: Question[] = [
  {
    id: "health",
    q: "How would you describe your senior's health situation right now?",
    choices: [
      { label: "Recent hospitalization or major incident", score: 0 },
      { label: "Concerning changes in the last 3 months", score: 1 },
      { label: "Slow, gradual changes", score: 2 },
      { label: "Stable. Just being proactive", score: 3 },
    ],
  },
  {
    id: "timeline",
    q: "What timeline are you working with?",
    choices: [
      { label: "Need to act in the next 30 days", score: 0 },
      { label: "1 to 3 months", score: 1 },
      { label: "3 to 12 months", score: 2 },
      { label: "More than a year", score: 3 },
    ],
  },
  {
    id: "family",
    q: "How aligned is the family on the plan?",
    choices: [
      { label: "Major disagreement", score: 0 },
      { label: "Some disagreement", score: 1 },
      { label: "Mostly aligned", score: 2 },
      { label: "Fully on the same page", score: 3 },
    ],
  },
  {
    id: "finances",
    q: "How confident are you about the financial picture?",
    choices: [
      { label: "Don't know what they have", score: 0 },
      { label: "Rough idea", score: 1 },
      { label: "Reasonably clear", score: 2 },
      { label: "Very clear and documented", score: 3 },
    ],
  },
  {
    id: "legal",
    q: "What legal documents are in place?",
    choices: [
      { label: "None", score: 0 },
      { label: "Basic will only", score: 1 },
      { label: "Will plus power of attorney", score: 2 },
      { label: "Full estate plan", score: 3 },
    ],
  },
  {
    id: "home",
    q: "Is the home in shape to sell or transition?",
    choices: [
      { label: "Major repairs needed", score: 0 },
      { label: "Some work to do", score: 1 },
      { label: "Mostly market-ready", score: 2 },
      { label: "Move-in shape", score: 3 },
    ],
  },
];

function stageFor(total: number): { name: string; color: string; advice: string } {
  if (total <= 6)
    return {
      name: "Crisis",
      color: "border-red-500 bg-red-50 text-red-900",
      advice:
        "Stop everything else. Skip to Module 5 (Safety & Repairs), Module 9 (Home Sale Strategy), and Module 10 (Move Coordination). Get the senior safe first. Come back to the earlier modules once the immediate crisis is handled.",
    };
  if (total <= 12)
    return {
      name: "Urgent",
      color: "border-amber-500 bg-amber-50 text-amber-900",
      advice:
        "You have weeks to months, not years. Work through Modules 1 to 6 quickly, then move to property and facility decisions in Modules 7 to 10. Keep weekly family check-ins.",
    };
  if (total <= 18)
    return {
      name: "Planning",
      color: "border-blue-500 bg-blue-50 text-blue-900",
      advice:
        "You have time to be thorough. Work through the modules in order at 2 to 3 per month. Use the assessments and tools as you go to build a real plan.",
    };
  return {
    name: "Stable",
    color: "border-emerald-500 bg-emerald-50 text-emerald-900",
    advice:
      "Use this gift of time. Focus on Modules 1 to 4 at a relaxed pace. Lock in legal documents (Module 6), get aligned as a family, and revisit annually.",
  };
}

export function StartingPointAssessment() {
  const [state, setState, status] = useToolState<State>("tool-01a", {
    answers: {},
  });

  const allAnswered = QUESTIONS.every((q) => state.answers[q.id] !== undefined);
  const total = QUESTIONS.reduce(
    (sum, q) => sum + (state.answers[q.id] ?? 0),
    0
  );
  const stage = allAnswered ? stageFor(total) : null;

  const setAnswer = (qid: string, score: number) => {
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [qid]: score } }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>
      <ol className="space-y-6">
        {QUESTIONS.map((q, idx) => (
          <li key={q.id} className="rounded-lg border border-neutral-200 p-5">
            <p className="text-sm font-medium text-neutral-500">
              Question {idx + 1} of {QUESTIONS.length}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{q.q}</h3>
            <div className="mt-3 space-y-2">
              {q.choices.map((c) => {
                const selected = state.answers[q.id] === c.score;
                return (
                  <label
                    key={c.label}
                    className={
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm " +
                      (selected
                        ? "border-amber-600 bg-amber-50"
                        : "border-neutral-200 hover:border-neutral-400")
                    }
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={selected}
                      onChange={() => setAnswer(q.id, c.score)}
                      className="h-4 w-4"
                    />
                    {c.label}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {stage ? (
        <aside className={"rounded-lg border-2 p-6 " + stage.color}>
          <p className="text-sm font-medium uppercase tracking-wide">Your starting point</p>
          <h2 className="mt-1 text-2xl font-semibold">{stage.name}</h2>
          <p className="mt-1 text-sm">Score: {total} of {QUESTIONS.length * 3}</p>
          <p className="mt-3 text-sm">{stage.advice}</p>
        </aside>
      ) : (
        <p className="text-sm text-neutral-500">
          Answer all questions to see your starting point.
        </p>
      )}
    </div>
  );
}
