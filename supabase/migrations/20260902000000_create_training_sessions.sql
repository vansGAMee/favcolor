create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  model_version integer not null check (model_version > 0),
  quality text not null check (quality = 'good'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);

alter table public.training_sessions enable row level security;
alter table public.training_sessions force row level security;

revoke all on table public.training_sessions from anon, authenticated;
grant insert on table public.training_sessions to anon, authenticated;

drop policy if exists "publishable clients insert good training sessions" on public.training_sessions;
create policy "publishable clients insert good training sessions"
on public.training_sessions
for insert
to anon, authenticated
with check (
  quality = 'good'
  and (payload ->> 'schema_version')::integer = 1
  and case
    when jsonb_typeof(payload -> 'observations') = 'array'
      then jsonb_array_length(payload -> 'observations') between 44 and 64
    else false
  end
);

comment on table public.training_sessions is
  'Opt-in anonymous pairwise color training sessions. Publishable clients have INSERT only.';
