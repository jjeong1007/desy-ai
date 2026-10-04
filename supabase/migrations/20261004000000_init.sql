-- Desy initial schema. Every row belongs to one auth user; RLS limits each user to their own rows.
-- Ideas keep their nested parts as jsonb that matches src/types (Idea, Analysis, ResearchPlan…),
-- because the client always loads an idea whole.

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null default 'Solo founder',
  settings jsonb not null default '{}'::jsonb,
  seeded_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- ideas

create table public.ideas (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  status text not null check (status in ('draft', 'running', 'complete')),
  intake jsonb not null,
  draft_step int,
  analysis jsonb,
  finding_state jsonb not null default '{}'::jsonb,
  adjustments jsonb not null default '{"criteria": {}, "rww": {}}'::jsonb,
  run jsonb,
  plan jsonb,
  history jsonb not null default '[]'::jsonb,
  seed boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Bumped on every write; updates compare it to avoid lost writes.
  version int not null default 0,
  primary key (user_id, id)
);

create index ideas_user_updated on public.ideas (user_id, updated_at desc);

-- ---------------------------------------------------------------- chats

create table public.chats (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  focus_idea_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.chat_messages (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  chat_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  refs jsonb,
  actions jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, chat_id) references public.chats (user_id, id) on delete cascade
);

create index chat_messages_chat on public.chat_messages (user_id, chat_id, created_at);

-- ---------------------------------------------------------------- MCP tokens

create table public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  -- SHA-256 of the token, hex. The token itself is shown once and never stored.
  token_hash text not null unique,
  -- First characters of the token, so people can tell tokens apart.
  prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index mcp_tokens_user on public.mcp_tokens (user_id);

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.mcp_tokens enable row level security;

create policy "own profile: read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own ideas" on public.ideas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own chats" on public.chats for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own chat messages" on public.chat_messages for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Tokens are created and revoked by the user; the hash lookup for MCP requests uses the service role.
create policy "own mcp tokens" on public.mcp_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
