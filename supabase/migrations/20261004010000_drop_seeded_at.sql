-- New accounts no longer get sample ideas; one demo account is seeded by scripts/demo-account.ts.
alter table public.profiles drop column if exists seeded_at;
