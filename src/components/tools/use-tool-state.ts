"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

// Hook that loads the user's saved state for a given tool and persists changes.
// Save is debounced so rapid input doesn't hammer the database.
//
// Usage:
//   const [state, setState, status] = useToolState<MyShape>("tool-00a", initial);
export function useToolState<T extends Record<string, unknown>>(
  toolSlug: string,
  initial: T
): readonly [T, (next: T | ((prev: T) => T)) => void, "loading" | "ready" | "saving" | "saved"] {
  const [state, setStateRaw] = useState<T>(initial);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved">(
    "loading"
  );
  const supabaseRef = useRef(createBrowserSupabaseClient());
  const userIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate from Supabase on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setStatus("ready");
        hydratedRef.current = true;
        return;
      }
      userIdRef.current = user.id;
      const { data } = await supabase
        .from("tool_state")
        .select("state")
        .eq("user_id", user.id)
        .eq("tool_slug", toolSlug)
        .maybeSingle();
      if (cancelled) return;
      if (data?.state && typeof data.state === "object") {
        setStateRaw({ ...initial, ...(data.state as Partial<T>) } as T);
      }
      setStatus("ready");
      hydratedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolSlug]);

  const persist = useCallback(
    async (next: T) => {
      const userId = userIdRef.current;
      if (!userId) return;
      setStatus("saving");
      const supabase = supabaseRef.current;
      const { error } = await supabase
        .from("tool_state")
        .upsert(
          { user_id: userId, tool_slug: toolSlug, state: next },
          { onConflict: "user_id,tool_slug" }
        );
      setStatus(error ? "ready" : "saved");
      if (!error) {
        // Drop "saved" indicator after a moment.
        setTimeout(() => setStatus((s) => (s === "saved" ? "ready" : s)), 1200);
      }
    },
    [toolSlug]
  );

  const setState = useCallback(
    (next: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const computed =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (hydratedRef.current && userIdRef.current) {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => persist(computed), 600);
        }
        return computed;
      });
    },
    [persist]
  );

  return [state, setState, status] as const;
}
