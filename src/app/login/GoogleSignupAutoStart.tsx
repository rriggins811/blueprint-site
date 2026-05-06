"use client";

import { useEffect, useRef } from "react";
import { signInWithGoogle } from "./actions";

type Props = {
  next: string;
};

// Client island for the cross-subdomain Google signup flow. When rss-site
// /freeguide bounces here with ?signup_via_google=1, we auto-submit the
// existing signInWithGoogle server action so PKCE state lives entirely on
// blueprint.rigginsstrategicsolutions.com — the verifier cookie set by the
// server-side OAuth call is the same cookie the /auth/callback reads.
export function GoogleSignupAutoStart({ next }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
      />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Redirecting to Google…
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Setting up your free Blueprint account. One click on Google&rsquo;s
        consent screen and you&rsquo;re in.
      </p>

      <form ref={formRef} action={signInWithGoogle} className="hidden">
        <input type="hidden" name="next" value={next} />
      </form>

      <noscript>
        <form action={signInWithGoogle} className="mt-8">
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Continue with Google
          </button>
        </form>
      </noscript>
    </main>
  );
}
