-- Vyapaari.AI — Business Brain schema
-- Run ALL of this in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- Two stores, exactly the Master Doc §6.4 split:
--   business_profile = structured exact facts (overwrite on change)
--   memories         = semantic conversation snippets + embeddings (append only)

create extension if not exists vector;

-- ---------- Structured memory ----------
create table if not exists business_profile (
  user_id          text primary key,
  owner_name       text,
  business_type    text,
  city             text,
  turnover         bigint,          -- annual, rupees
  margin_pct       numeric,
  cash_on_hand     bigint,          -- rupees available now
  peak_season      text,
  loans            jsonb default '[]'::jsonb,   -- [{lender, principal, emi, months_left}]
  customers        jsonb default '[]'::jsonb,   -- [{name, owed, last_paid, trend}]
  supplier_terms   text,            -- payment terms with main suppliers
  discount_policy  text,            -- when/how they give discounts
  main_challenge   text,            -- biggest current challenge
  main_goal        text,            -- main goal for the year
  language_pref    text default 'hindi',
  onboarding_done  boolean default false,
  updated_at       timestamptz default now()
);

-- ---------- Semantic memory ----------
-- gemini-embedding-001 returns 768-dim vectors.
create table if not exists memories (
  id          bigserial primary key,
  user_id     text not null,
  text        text not null,
  kind        text default 'conversation',  -- conversation | fact | insight
  embedding   vector(768),
  created_at  timestamptz default now()
);

create index if not exists memories_user_idx on memories (user_id);
create index if not exists memories_embedding_idx
  on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------- Semantic recall RPC ----------
create or replace function match_memories(
  p_user_id   text,
  p_query     vector(768),
  p_limit     int default 5
)
returns table (id bigint, text text, kind text, created_at timestamptz, similarity float)
language sql stable as $$
  select m.id, m.text, m.kind, m.created_at,
         1 - (m.embedding <=> p_query) as similarity
  from memories m
  where m.user_id = p_user_id and m.embedding is not null
  order by m.embedding <=> p_query
  limit p_limit;
$$;

-- ---------- Migration: add new columns to existing installs ----------
-- Safe to run on an existing DB — IF NOT EXISTS / DO NOTHING handles it.
alter table business_profile add column if not exists supplier_terms  text;
alter table business_profile add column if not exists discount_policy text;
alter table business_profile add column if not exists main_challenge  text;
alter table business_profile add column if not exists main_goal       text;
alter table business_profile add column if not exists language_pref   text default 'hindi';
alter table business_profile add column if not exists onboarding_done boolean default false;
alter table business_profile add column if not exists gender          text check (gender in ('male','female','other'));
