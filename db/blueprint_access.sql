-- Blueprint Map ($9.99 tripwire) buyer access store.
-- Applied live to Supabase project ynsakoxsmuvwfjgbhxky on 2026-06-15.
-- Kept here for source-of-truth; this DB is shared with rss-site + senior-safe.
--
-- Write path: the Stripe webhook (src/app/api/stripe/webhook/route.ts, tier=map
-- branch) inserts one row per $9.99 purchase using the service-role key.
-- Read path: rss-site's map page validates a buyer's ?token= via the
-- blueprint_access_tier() function below (anon-callable, returns only the tier).

create table if not exists public.blueprint_access (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  access_token      uuid not null default gen_random_uuid() unique,
  tier              text not null default 'map' check (tier in ('map','map_book','full')),
  stripe_session_id text unique,
  source            text,
  created_at        timestamptz not null default now()
);

alter table public.blueprint_access enable row level security;
-- No anon/authenticated policies on purpose: writes happen only via the
-- service-role webhook, reads only via the SECURITY DEFINER function below.

create or replace function public.blueprint_access_tier(p_token uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select tier from public.blueprint_access where access_token = p_token limit 1;
$$;

revoke all on function public.blueprint_access_tier(uuid) from public;
grant execute on function public.blueprint_access_tier(uuid) to anon, authenticated;
