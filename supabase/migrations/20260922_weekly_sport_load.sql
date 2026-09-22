-- Run in Supabase SQL editor if schema.sql was already applied without weekly_sport_load.

create table if not exists public.weekly_sport_load (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    week_start date not null,
    block_index int,
    week_in_block int,
    kind text,
    phase_code text,
    planned_run_min numeric,
    planned_bike_min numeric,
    planned_swim_min numeric,
    planned_walk_min numeric,
    planned_total_min numeric,
    executed_run_min numeric,
    executed_bike_min numeric,
    executed_swim_min numeric,
    executed_walk_min numeric,
    executed_other_min numeric,
    executed_total_min numeric,
    payload jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, week_start)
);

create index if not exists idx_weekly_sport_load_week on public.weekly_sport_load (user_id, week_start desc);

alter table public.weekly_sport_load enable row level security;
create policy "service_role_all" on public.weekly_sport_load for all using (true) with check (true);
