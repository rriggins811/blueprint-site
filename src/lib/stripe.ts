import Stripe from "stripe";

// Lazily instantiate the Stripe client at REQUEST time, not import time.
//
// `next build` evaluates every route module during "Collecting page data".
// If the client were created at module top-level (export const stripe =
// new Stripe(process.env.STRIPE_SECRET_KEY!)), any build environment without
// STRIPE_SECRET_KEY — e.g. a Vercel Preview deploy that doesn't carry the
// production secret — throws "Neither apiKey nor config.authenticator
// provided" and fails the build (it did, on the warm-funnel-jun16 preview).
//
// Creating it on first use keeps the build env-agnostic. Runtime behavior is
// identical: same key, same client, cached as a singleton so we still only
// ever construct one Stripe instance per process.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  _stripe = new Stripe(apiKey, {
    apiVersion: "2025-10-29.clover",
    typescript: true,
  });
  return _stripe;
}
