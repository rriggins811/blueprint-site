"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator } from "./SaveIndicator";

type State = { answers: Record<string, number> };

const STATEMENTS: Array<{ id: string; text: string }> = [
  { id: "exhausted", text: "I feel exhausted even after sleeping" },
  { id: "irritable", text: "I'm irritable with the person I'm caring for" },
  { id: "friends", text: "I've stopped seeing my own friends" },
  { id: "physical", text: "I have frequent headaches or stomach issues" },
  { id: "resentful", text: "I feel resentful about the caregiving role" },
  { id: "health", text: "I'm neglecting my own health appointments" },
  { id: "overwhelmed", text: "I feel overwhelmed by responsibilities" },
  { id: "self", text: "I can't remember the last time I did something for myself" },
  { id: "guilt", text: "I feel guilty when I'm not caregiving" },
  { id: "sleep", text: "I'm sleeping poorly or too much" },
  { id: "interest", text: "I've lost interest in things I used to enjoy" },
  { id: "understood", text: "I feel like no one understands what I'm going through" },
];

const SCALE = [
  { value: 0, label: "Never" },
  { value: 1, label: "Sometimes" },
  { value: 2, label: "Often" },
  { value: 3, label: "Always" },
];

const MAX_SCORE = STATEMENTS.length * 3;

function bandFor(total: number) {
  if (total <= 12)
    return {
      name: "Managing well",
      color: "border-emerald-500 bg-emerald-50 text-emerald-900",
      advice:
        "You are holding up well right now. Keep the self-care habits that got you here. Retake this monthly so you catch any drift early.",
    };
  if (total <= 24)
    return {
      name: "Warning zone",
      color: "border-amber-500 bg-amber-50 text-amber-900",
      advice:
        "You are in the warning zone. Put at least two prevention strategies in place this week, and delegate something. You do not have to carry all of it. Module 18 has ideas if you need a starting point.",
    };
  return {
    name: "Active burnout",
    color: "border-red-500 bg-red-50 text-red-900",
    advice:
      "This is active burnout. Get help now. Arrange respite care and talk to someone, whether that is your doctor, a counselor, or a trusted friend. Burnout is not weakness, it is a signal. Module 18 walks through your options.",
  };
}

export function BurnoutAssessment() {
  const [state, setState, status] = useToolState<State>("tool-18a-v2", {
    answers: {},
  });

  const setAnswer = (id: string, value: number) => {
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [id]: value } }));
  };

  const answered = STATEMENTS.filter(
    (s) => typeof state.answers[s.id] === "number"
  ).length;
  const total = STATEMENTS.reduce(
    (sum, s) => sum + (state.answers[s.id] ?? 0),
    0
  );
  const allDone = answered === STATEMENTS.length;
  const band = allDone ? bandFor(total) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <SaveIndicator status={status} />
      </div>
      <p className="text-sm text-neutral-600">
        This is for you, the caregiver. Be honest, nobody else sees it. Rate each
        statement: 0 = Never, 1 = Sometimes, 2 = Often, 3 = Always.
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
                    {opt.value} = {opt.label}
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
            Score: {total} of {MAX_SCORE}
          </p>
          <p className="mt-3 text-sm">{band.advice}</p>
        </aside>
      ) : (
        <p className="text-sm text-neutral-500">
          Answered {answered} of {STATEMENTS.length}. Finish all to see your read.
        </p>
      )}
      <aside className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
          Resources
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-neutral-700">
          <li className="flex flex-wrap justify-between gap-2">
            <span>Caregiver Action Network</span>
            <a href="tel:1-855-227-3640" className="font-medium">
              1-855-227-3640
            </a>
          </li>
          <li className="flex flex-wrap justify-between gap-2">
            <span>Eldercare Locator</span>
            <a href="tel:1-800-677-1116" className="font-medium">
              1-800-677-1116
            </a>
          </li>
        </ul>
        <p className="mt-4 text-sm text-neutral-700">
          <span className="font-semibold">You cannot pour from an empty cup.</span>{" "}
          If the score is climbing, line up respite before you hit the wall: an
          adult day program, a few hours of in-home help, a rotation with family.
          Taking care of you is part of taking care of them.
        </p>
        <p className="mt-3 text-sm text-neutral-500">Retake this monthly.</p>
      </aside>
    </div>
  );
}
