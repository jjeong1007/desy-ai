-- Landing page waitlist. RLS is on with no policies, so only the service role (the server action) can read or write it.
create table public.waitlist (
  email text primary key check (email = lower(email) and char_length(email) <= 320),
  source text not null default 'landing',
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
