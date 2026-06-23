-- Vyapaari.AI — Phone OTP auth migration
-- Run in the Supabase SQL editor AFTER db/schema.sql.
--
-- Design:
--   * Supabase Auth already stores the verified phone uniquely in auth.users.phone.
--   * business_profile.user_id holds the authenticated auth.users.id (UUID, as text).
--   * We mirror the phone here as a UNIQUE column for easy querying/joins.

alter table business_profile
  add column if not exists phone text;

-- One profile per phone number — enforces "mobile number = unique user".
create unique index if not exists business_profile_phone_idx
  on business_profile (phone)
  where phone is not null;

-- ---------- Row Level Security (defense-in-depth) ----------
-- The API routes now derive userId from the verified Supabase session token
-- (see src/lib/auth.ts), so the primary authorization is enforced in the routes.
-- These policies are a second line of defense: the SERVICE ROLE key used by the
-- server routes bypasses RLS, but enabling RLS means that if anything ever queries
-- these tables from the browser with the anon key + the user's session, a user can
-- only ever see/write their own rows. Run this block in the Supabase SQL editor.

alter table business_profile enable row level security;
alter table memories          enable row level security;

create policy "own profile" on business_profile
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "own memories" on memories
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
