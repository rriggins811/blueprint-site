"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INTAKE_SECTIONS,
  PROPERTY_FIELDS,
  URGENT_FIRST_FIELD,
  SKIP_LABELS,
  type IntakeField,
  type SkipState,
} from "@/lib/intake-schema";
import { saveIntakeSection, submitIntake } from "./actions";

/**
 * The intake, one section per screen.
 *
 * The whole design serves one risk: abandonment. The reader is an exhausted
 * adult child who was told this is optional, so everything here is built to
 * make stopping safe rather than to push them forward.
 *
 *   - Nothing is required. Identity came from the application.
 *   - Every field can be skipped, and on flag-critical fields a family can say
 *     "I don't know" explicitly, which is recorded as a flag rather than lost.
 *   - Autosave is debounced and also fires on every screen change, so closing
 *     the tab mid-crisis never costs them anything.
 *   - "Finish the rest on the call" is offered on every screen and submits
 *     what they have. A partial intake is a real, useful outcome.
 *
 * The urgency question is hoisted to screen one: if someone is being pushed to
 * sign, that is worth knowing even from a family who gives us thirty seconds.
 */

const AUTOSAVE_DEBOUNCE_MS = 900;

type SectionData = Record<string, unknown>;
type AllData = Record<string, SectionData>;

export function IntakeForm({
  token,
  firstName,
  initialData,
  initialSkips,
  initialSection,
}: {
  token: string;
  firstName: string;
  initialData: AllData;
  initialSkips: Record<string, SkipState>;
  initialSection: number;
}) {
  // Screen 0 is the urgency question, then one screen per canonical section.
  const [screen, setScreen] = useState(initialSection);
  const [data, setData] = useState<AllData>(initialData);
  const [skips, setSkips] = useState<Record<string, SkipState>>(initialSkips);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [done, setDone] = useState<null | "complete" | "partial">(null);
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalScreens = INTAKE_SECTIONS.length + 1;
  const isUrgentScreen = screen === 0;
  const section = isUrgentScreen ? null : INTAKE_SECTIONS[screen - 1];

  const persist = useCallback(
    async (column: string, answers: SectionData, nextSkips: Record<string, SkipState>, at: number) => {
      setSaveState("saving");
      const res = await saveIntakeSection({
        token,
        column,
        answers,
        skips: nextSkips,
        lastSection: at,
      });
      setSaveState(res.ok ? "saved" : "error");
    },
    [token]
  );

  const currentColumn = isUrgentScreen ? "pressure_offers_json" : section!.column;

  // Debounced autosave. A write per keystroke across ~70 fields would be a lot
  // of traffic and would race itself; a short debounce plus the save on every
  // screen change gives the same resumability.
  const queueSave = useCallback(
    (column: string, nextData: AllData, nextSkips: Record<string, SkipState>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void persist(column, nextData[column] ?? {}, nextSkips, screen);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [persist, screen]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const setField = (column: string, name: string, value: unknown) => {
    setData((prev) => {
      const next = { ...prev, [column]: { ...(prev[column] ?? {}), [name]: value } };
      // Answering clears any skip previously recorded for that field.
      setSkips((prevSkips) => {
        if (!prevSkips[name]) {
          queueSave(column, next, prevSkips);
          return prevSkips;
        }
        const nextSkips = { ...prevSkips };
        delete nextSkips[name];
        queueSave(column, next, nextSkips);
        return nextSkips;
      });
      return next;
    });
  };

  const setSkip = (column: string, name: string, state: SkipState) => {
    setSkips((prev) => {
      const next = { ...prev };
      if (next[name] === state) delete next[name];
      else next[name] = state;
      queueSave(column, data, next);
      return next;
    });
  };

  const goto = async (next: number) => {
    if (timer.current) clearTimeout(timer.current);
    await persist(currentColumn, data[currentColumn] ?? {}, skips, next);
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = async (complete: boolean) => {
    setSubmitting(true);
    if (timer.current) clearTimeout(timer.current);
    await persist(currentColumn, data[currentColumn] ?? {}, skips, screen);
    const res = await submitIntake({ token, complete });
    setSubmitting(false);
    if (res.ok) setDone(complete ? "complete" : "partial");
    else setSaveState("error");
  };

  const flagCount = useMemo(() => Object.keys(skips).length, [skips]);

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-xl border border-[#e7e2d6] bg-white p-8">
          <h1 className="font-serif text-2xl text-[#1B365D]">Thank you, {firstName}</h1>
          <p className="mt-4 leading-relaxed text-[#4a5568]">
            {done === "complete"
              ? "That is everything. Ryan reads it before your call, so you will not have to repeat any of it."
              : "Got what you gave us, and that is genuinely useful. Ryan reads it before your call and you will walk through the rest together."}
          </p>
          <p className="mt-4 text-sm text-[#6b7280]">
            If something changes before the call, reply to your confirmation email.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8C1D2F]">
            Step {screen + 1} of {totalScreens}
          </p>
          <p aria-live="polite" className="text-xs text-[#6b7280]">
            {saveState === "saving" && "Saving..."}
            {saveState === "saved" && "Saved"}
            {saveState === "error" && "Could not save, your answers are still here"}
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-[#e5e7eb]">
          <div
            className="h-full rounded bg-[#D4A843] transition-all duration-300"
            style={{ width: `${((screen + 1) / totalScreens) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#e7e2d6] bg-white p-8">
        {isUrgentScreen ? (
          <>
            <h1 className="font-serif text-2xl leading-snug text-[#1B365D]">
              First, the one that cannot wait.
            </h1>
            <p className="mt-3 leading-relaxed text-[#4a5568]">
              Everything here is optional, {firstName}. Answer what you can, skip what you cannot,
              and stop whenever you want. Even a half-finished form makes your call better.
            </p>
            <div className="mt-8">
              <FieldRow
                field={URGENT_FIRST_FIELD}
                column="pressure_offers_json"
                value={data.pressure_offers_json?.[URGENT_FIRST_FIELD.name]}
                detail={data.pressure_offers_json?.[`${URGENT_FIRST_FIELD.name}__detail`]}
                skip={skips[URGENT_FIRST_FIELD.name]}
                onChange={setField}
                onSkip={setSkip}
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl leading-snug text-[#1B365D]">{section!.title}</h1>
            <p className="mt-2 leading-relaxed text-[#6b7280]">{section!.blurb}</p>
            <div className="mt-8 space-y-8">
              {section!.fields.map((f) => (
                <FieldRow
                  key={f.name}
                  field={f}
                  column={section!.column}
                  value={data[section!.column]?.[f.name]}
                  detail={data[section!.column]?.[`${f.name}__detail`]}
                  skip={skips[f.name]}
                  onChange={setField}
                  onSkip={setSkip}
                />
              ))}
              {section!.key === "other_property" &&
                String(data.other_property_json?.owns_other_real_estate ?? "") === "Yes" && (
                  <PropertyRepeater
                    value={
                      (data.other_property_json?.properties as Record<string, unknown>[]) ?? []
                    }
                    skips={skips}
                    onChange={(list) => setField("other_property_json", "properties", list)}
                    onSkip={(name, state) => setSkip("other_property_json", name, state)}
                  />
                )}
            </div>
          </>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[#e7e2d6] pt-6">
          {screen > 0 && (
            <button
              type="button"
              onClick={() => void goto(screen - 1)}
              className="rounded-lg border border-[#d1d5db] px-5 py-3 text-[#4a5568] hover:bg-[#f9fafb]"
            >
              Back
            </button>
          )}
          {screen < totalScreens - 1 ? (
            <button
              type="button"
              onClick={() => void goto(screen + 1)}
              className="ml-auto rounded-lg bg-[#1B365D] px-6 py-3 font-semibold text-white hover:bg-[#152c4d]"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void finish(true)}
              className="ml-auto rounded-lg bg-[#8C1D2F] px-6 py-3 font-semibold text-white hover:bg-[#731825] disabled:bg-[#9ca3af]"
            >
              {submitting ? "Sending..." : "Send this to Ryan"}
            </button>
          )}
        </div>
      </div>

      {/* Offered on every screen, never buried. Stopping has to feel safe. */}
      <div className="mt-6 text-center">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void finish(false)}
          className="text-sm font-semibold text-[#8C1D2F] underline underline-offset-4 hover:text-[#731825] disabled:opacity-50"
        >
          Finish the rest on the call
        </button>
        <p className="mt-2 text-xs text-[#9ca3af]">
          Sends what you have so far. {flagCount > 0 ? `${flagCount} marked as unknown or not applicable.` : ""}
        </p>
      </div>
    </main>
  );
}

function FieldRow({
  field,
  column,
  value,
  detail,
  skip,
  onChange,
  onSkip,
}: {
  field: IntakeField;
  column: string;
  value: unknown;
  detail: unknown;
  skip?: SkipState;
  onChange: (column: string, name: string, value: unknown) => void;
  onSkip: (column: string, name: string, state: SkipState) => void;
}) {
  const id = `f-${field.name}`;
  const skipped = Boolean(skip);
  const showDetail =
    !skipped &&
    field.detailWhen &&
    field.detailWhen.includes(String(value ?? "")) &&
    Boolean(field.detailLabel);

  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-[#1B365D]">
        {field.label}
      </label>
      {field.help && <p className="mt-1 text-sm text-[#6b7280]">{field.help}</p>}

      <div className={skipped ? "mt-2 opacity-40" : "mt-2"}>
        <FieldInput id={id} field={field} value={value} disabled={skipped} onChange={(v) => onChange(column, field.name, v)} />
      </div>

      {showDetail && (
        <div className="mt-3">
          <label htmlFor={`${id}-detail`} className="block text-sm font-semibold text-[#1B365D]">
            {field.detailLabel}
          </label>
          <textarea
            id={`${id}-detail`}
            rows={2}
            value={String(detail ?? "")}
            onChange={(e) => onChange(column, `${field.name}__detail`, e.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-[#e2e8f0] px-3 py-2 text-[#1B365D] focus:border-[#D4A843] focus:outline-none"
          />
        </div>
      )}

      {/* Three-state capture on flag-critical fields. "Don't know if there's a
          POA" is the single most valuable thing this form can learn, so it gets
          a real button rather than being left as an empty box. */}
      <div className="mt-2 flex flex-wrap gap-2">
        {(field.flagCritical ? (["dont_know", "not_applicable"] as SkipState[]) : (["skipped"] as SkipState[])).map(
          (state) => (
            <button
              key={state}
              type="button"
              aria-pressed={skip === state}
              onClick={() => onSkip(column, field.name, state)}
              className={
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors " +
                (skip === state
                  ? "border-[#8C1D2F] bg-[#8C1D2F] text-white"
                  : "border-[#d1d5db] text-[#6b7280] hover:border-[#8C1D2F] hover:text-[#8C1D2F]")
              }
            >
              {state === "skipped" ? "Skip this" : SKIP_LABELS[state]}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function FieldInput({
  id,
  field,
  value,
  disabled,
  onChange,
}: {
  id: string;
  field: IntakeField;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}) {
  const base =
    "w-full rounded-lg border-2 border-[#e2e8f0] px-3 py-2 text-[#1B365D] focus:border-[#D4A843] focus:outline-none disabled:bg-[#f9fafb]";

  if (field.type === "select") {
    return (
      <select id={id} disabled={disabled} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">Choose one</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-2">
        {field.options?.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
              className={
                "rounded-full border-2 px-4 py-2 text-sm transition-colors " +
                (on
                  ? "border-[#D4A843] bg-[#fffdf7] font-semibold text-[#1B365D]"
                  : "border-[#e2e8f0] text-[#4a5568] hover:border-[#D4A843]")
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === "scale") {
    const current = Number(value ?? 0);
    return (
      <div className="flex gap-2" role="group" aria-labelledby={id}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-pressed={current === n}
            onClick={() => onChange(n)}
            className={
              "h-11 w-11 rounded-lg border-2 font-semibold transition-colors " +
              (current === n
                ? "border-[#D4A843] bg-[#fffdf7] text-[#1B365D]"
                : "border-[#e2e8f0] text-[#4a5568] hover:border-[#D4A843]")
            }
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "longtext") {
    return (
      <textarea
        id={id}
        rows={3}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      />
    );
  }

  const inputType =
    field.type === "number" || field.type === "currency"
      ? "text"
      : field.type === "date"
        ? "date"
        : field.type === "email"
          ? "email"
          : field.type === "phone"
            ? "tel"
            : "text";

  return (
    <input
      id={id}
      type={inputType}
      inputMode={field.type === "number" || field.type === "currency" ? "decimal" : undefined}
      disabled={disabled}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className={base}
    />
  );
}

/**
 * Other Property, repeatable. Some families have five, and each one needs its
 * own title question: a property titled to someone who has died, with the
 * estate never opened, is where the biggest money gets trapped.
 */
function PropertyRepeater({
  value,
  skips,
  onChange,
  onSkip,
}: {
  value: Record<string, unknown>[];
  skips: Record<string, SkipState>;
  onChange: (list: Record<string, unknown>[]) => void;
  onSkip: (name: string, state: SkipState) => void;
}) {
  const list = value.length ? value : [{}];

  const update = (i: number, name: string, v: unknown) => {
    const next = list.map((p, idx) => (idx === i ? { ...p, [name]: v } : p));
    onChange(next);
  };

  return (
    <div className="space-y-6">
      {list.map((prop, i) => (
        <fieldset key={i} className="rounded-lg border border-[#e7e2d6] bg-[#fffdf7] p-5">
          <legend className="px-2 font-serif text-lg text-[#1B365D]">Property {i + 1}</legend>
          <div className="space-y-6">
            {PROPERTY_FIELDS.map((f) => (
              <FieldRow
                key={f.name}
                field={f}
                column="other_property_json"
                value={prop[f.name]}
                detail={prop[`${f.name}__detail`]}
                skip={skips[`properties.${i}.${f.name}`]}
                onChange={(_c, name, v) => update(i, name, v)}
                onSkip={(_c, name, state) => onSkip(`properties.${i}.${name}`, state)}
              />
            ))}
          </div>
          {list.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(list.filter((_, idx) => idx !== i))}
              className="mt-4 text-sm font-semibold text-[#8C1D2F] underline underline-offset-4"
            >
              Remove this property
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() => onChange([...list, {}])}
        className="rounded-lg border-2 border-[#e2e8f0] px-5 py-3 font-semibold text-[#1B365D] hover:border-[#D4A843]"
      >
        Add another property
      </button>
    </div>
  );
}
