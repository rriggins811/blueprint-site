"use client";

import { useToolState } from "./use-tool-state";
import { SaveIndicator } from "./SaveIndicator";

type State = { completed: Record<string, boolean> };

const DAYS: Array<{ day: number; label: string; tasks: string[] }> = [
  {
    day: 1,
    label: "Read and orient",
    tasks: [
      "Read Module 00 in full.",
      "Send the Family Sharing Letter to siblings.",
      "Print or save this 7-Day Checklist.",
    ],
  },
  {
    day: 2,
    label: "Talk to your parent",
    tasks: [
      "Have a 15-minute conversation about the Blueprint.",
      "Write down their biggest concern.",
      "Note their preferred timeline.",
    ],
  },
  {
    day: 3,
    label: "Spot the safety risks",
    tasks: [
      "Walk the home and list any fall hazards.",
      "Make a list of every adult family member who needs to be in the loop.",
      "Pick one person to be the family coordinator.",
    ],
  },
  {
    day: 4,
    label: "First financial pass",
    tasks: [
      "Pull last 3 months of statements for major accounts.",
      "List every recurring bill and subscription.",
      "Flag anything that looks like a scam or auto-renewal trap.",
    ],
  },
  {
    day: 5,
    label: "Take the Starting Point Assessment",
    tasks: [
      "Open Module 01 and take the Starting Point Assessment tool.",
      "Write down the recommended path.",
      "Share the result with the family coordinator.",
    ],
  },
  {
    day: 6,
    label: "Pick the next three modules",
    tasks: [
      "Choose three modules to work through next.",
      "Put them on a shared family calendar.",
      "Schedule a weekly 20-minute family check-in.",
    ],
  },
  {
    day: 7,
    label: "Review the week",
    tasks: [
      "Look at what you got done. Celebrate one small win.",
      "Write down the single biggest blocker.",
      "Plan next week with the family coordinator.",
    ],
  },
];

const ALL_KEYS = DAYS.flatMap((d) => d.tasks.map((_, i) => `d${d.day}-t${i}`));

export function QuickStart7Day() {
  const [state, setState, status] = useToolState<State>("tool-00a", {
    completed: {},
  });

  const doneCount = ALL_KEYS.filter((k) => state.completed[k]).length;
  const total = ALL_KEYS.length;
  const pct = Math.round((doneCount / total) * 100);

  const toggle = (key: string) => {
    setState((prev) => ({
      ...prev,
      completed: { ...prev.completed, [key]: !prev.completed[key] },
    }));
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {doneCount} of {total} done ({pct}%)
        </p>
        <SaveIndicator status={status} />
      </header>
      <div className="h-2 w-full rounded bg-neutral-100">
        <div
          className="h-2 rounded bg-amber-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="space-y-6">
        {DAYS.map((d) => (
          <li key={d.day} className="rounded-lg border border-neutral-200 p-5">
            <h3 className="text-lg font-semibold">
              Day {d.day}. {d.label}
            </h3>
            <ul className="mt-3 space-y-2">
              {d.tasks.map((task, i) => {
                const key = `d${d.day}-t${i}`;
                const checked = !!state.completed[key];
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(key)}
                        className="mt-1 h-4 w-4 rounded border-neutral-300"
                      />
                      <span
                        className={
                          checked
                            ? "text-neutral-400 line-through"
                            : "text-neutral-800"
                        }
                      >
                        {task}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
