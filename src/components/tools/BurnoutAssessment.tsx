"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator } from "./SaveIndicator";

type State = { answers: Record<string, number> };

const STATEMENTS: Array<{ id: string; text: string }> = [
  { id: "tired", text: "I feel exhausted even after a full night of sleep." },
  { id: "patience", text: "I have less patience than I used to with the people I care about." },
  { id: "guilt", text: "I feel guilty when I take time for myself." },
  { id: "isolation", text: "I have stopped seeing friends or doing things I used to enjoy." },
  { id: "irritation", text: "Small things irritate me more than they should." },
  { id: "appetite", text: "My appetite or weight has changed in the last few months." },
  { id: "physical", text: "I have new physical symptoms (headaches, stomach issues, back pain)." },
  { id: "anxiety", text: "I worry about my parent's situation even when I am away from it." },
  { id: "trapped", text: "I feel trapped or stuck in this caregiving role." },
  { id: "resentment", text: "I sometimes feel resentment toward my parent or other family members." },
  { id: "competence", text: "I doubt my ability to handle what is in front of me." },
  { id: "joy", text: "I rarely feel joy or satisfaction from caregiving." },
];

const SCALE = [
  { value: 1, label: "Never" },
  { value: 2, label: "Rarely" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Often" },
  { value: 5, label: "Almost always" },
];

function bandFor(total: number, answered: number) {
  const fraction = total / (answered * 5);
  if (fraction < 0.4)
    return {
      name: "Healthy",
      color: "border-emerald-500 bg-emerald-50 text-emerald-900",
      advice:
        "You are managing well right now. Keep the rhythms that are working. Revisit this assessment monthly so you catch any drift early.",
    };
  if (fraction < 0.6)
    return {
      name: "Strained",
      color: "border-blue-500 bg-blue-50 text-blue-900",
      advice:
        "You are showing signs of caregiver strain. Schedule one specific kind of respite this week. Tell one trusted person what is hard right now.",
    };
  if (fraction < 0.8)
    return {
      name: "Approaching burnout",
      color: "border-amber-500 bg-amber-50 text-amber-900",
      advice:
        "You are running out of capacity. Get on the phone with your doctor or a therapist this week. Re-divide care duties with the family. Read Module 18.",
    };
  return {
    name: "Burnout",
    color: "border-red-500 bg-red-50 text-red-900",
    advice:
      "You need help right now. This is not a moral failing. Call your doctor today, talk to your support network, and consider stepping back from primary caregiving while you recover.",
  };
}

export function BurnoutAssessment() {
  const [state, setState, status] = useToolState<State>("tool-18a", { answers: {} });

  const setAnswer = (id: string, value: number) => {
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [id]: value } }));
  };

  const answered = Object.values(state.answers).filter((v) => v > 0).length;
  const total = Object.values(state.answers).reduce((a, b) => a + b, 0);
  const allDone = answered === STATEMENTS.length;
  const band = allDone ? bandFor(total, answered) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>
      <p className="text-sm text-neutral-600">
        Answer honestly. Nobody sees these answers but you. Use the scale: 1 = never,
        5 = almost always.
      </p>
      <ol className="space-y-4">
        {STATEMENTS.map((s, idx) => (
          <li key={s.id} className="rounded-lg border border-neutral-200 p-4">
            <p className="text-sm">
              <span className="text-neutral-500">{idx + 1}.</span> {s.text}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SCALE.map((opt) => {
                const selected = state.answers[s.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswer(s.id, opt.value)}
                    className={
                      "rounded-md border px-3 py-1 text-xs " +
                      (selected
                        ? "border-amber-600 bg-amber-50 font-semibold text-amber-900"
                        : "border-neutral-200 text-neutral-700 hover:border-neutral-400")
                    }
                  >
                    {opt.value} — {opt.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {band ? (
        <aside className={"rounded-lg border-2 p-6 " + band.color}>
          <p className="text-sm font-medium uppercase tracking-wide">Your read</p>
          <h2 className="mt-1 text-2xl font-semibold">{band.name}</h2>
          <p className="mt-1 text-sm">
            Score: {total} of {STATEMENTS.length * 5}
          </p>
          <p className="mt-3 text-sm">{band.advice}</p>
        </aside>
      ) : (
        <p className="text-sm text-neutral-500">
          Answered {answered} of {STATEMENTS.length}. Finish all to see your read.
        </p>
      )}
    </div>
  );
}
