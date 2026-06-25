-- Spirit Squad Coach HQ — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Teams ────────────────────────────────────────────────────────────────────
create table teams (
  id          bigserial primary key,
  owner_id    uuid references auth.users not null,
  name        text not null,
  division    text default '',
  level       text default '',
  created_at  timestamptz default now()
);

-- ─── Team Members (coaches with roles) ───────────────────────────────────────
create table team_members (
  id        bigserial primary key,
  team_id   bigint references teams on delete cascade,
  user_id   uuid references auth.users,
  role      text not null default 'editor', -- 'admin' | 'editor' | 'viewer'
  unique (team_id, user_id)
);

-- ─── Seasons ──────────────────────────────────────────────────────────────────
create table seasons (
  id          bigserial primary key,
  team_id     bigint references teams on delete cascade,
  label       text not null,
  is_current  boolean default false,
  created_at  timestamptz default now()
);

-- ─── Athletes ─────────────────────────────────────────────────────────────────
create table athletes (
  id               bigserial primary key,
  team_id          bigint references teams on delete cascade,
  name             text not null,
  grade            text default '',
  position         text default '',
  photo_url        text,
  email            text default '',
  phone            text default '',
  is_youth         boolean default false,
  parent_name      text default '',
  parent_email     text default '',
  parent_phone     text default '',
  emergency_name   text default '',
  emergency_phone  text default '',
  created_at       timestamptz default now()
);

-- ─── Evaluation Log (append-only) ────────────────────────────────────────────
create table eval_log (
  id          bigserial primary key,
  athlete_id  bigint references athletes on delete cascade,
  team_id     bigint references teams on delete cascade,
  category    text not null,          -- 'jumps' | 'tumbling' | 'stunting'
  skill       text not null,
  position    text,                   -- stunting only
  rating      text not null,          -- 'na' | 'not_started' | 'working_on' | 'consistent' | 'comp_ready'
  date        date not null,
  season      text not null,
  created_at  timestamptz default now()
);

-- ─── N/A Skills ───────────────────────────────────────────────────────────────
create table na_skills (
  id          bigserial primary key,
  athlete_id  bigint references athletes on delete cascade,
  team_id     bigint references teams on delete cascade,
  na_key      text not null,          -- e.g. 'jumps|Toe Touch' or 'stunting|Liberty|Flyer'
  unique (athlete_id, na_key)
);

-- ─── Stunt Groups ─────────────────────────────────────────────────────────────
create table stunt_groups (
  id        bigserial primary key,
  team_id   bigint references teams on delete cascade,
  name      text not null,
  created_at timestamptz default now()
);

create table group_slots (
  id          bigserial primary key,
  group_id    bigint references stunt_groups on delete cascade,
  slot_key    text not null,          -- client-generated slotId
  position    text not null,
  label       text not null,
  athlete_id  bigint references athletes on delete set null,
  sort_order  int default 0
);

create table group_log (
  id        bigserial primary key,
  group_id  bigint references stunt_groups on delete cascade,
  team_id   bigint references teams on delete cascade,
  skill     text not null,
  rating    text not null,
  date      date not null,
  season    text not null,
  created_at timestamptz default now()
);

-- ─── Pyramids ─────────────────────────────────────────────────────────────────
create table pyramids (
  id        bigserial primary key,
  team_id   bigint references teams on delete cascade,
  name      text not null,
  created_at timestamptz default now()
);

create table pyramid_sections (
  id              bigserial primary key,
  pyramid_id      bigint references pyramids on delete cascade,
  section_key     text not null,
  section_number  int not null,
  name            text not null,
  sort_order      int default 0
);

create table pyramid_layers (
  id            bigserial primary key,
  section_id    bigint references pyramid_sections on delete cascade,
  layer_key     text not null,
  layer_number  int not null,
  height_label  text default ''
);

create table pyramid_slots (
  id          bigserial primary key,
  layer_id    bigint references pyramid_layers on delete cascade,
  slot_key    text not null,
  position    text not null,
  label       text not null,
  athlete_id  bigint references athletes on delete set null,
  sort_order  int default 0
);

-- ─── Attendance ───────────────────────────────────────────────────────────────
create table attendance (
  id          bigserial primary key,
  team_id     bigint references teams on delete cascade,
  athlete_id  bigint references athletes on delete cascade,
  date        date not null,
  status      text not null default 'present',  -- 'present' | 'absent' | 'excused'
  unique (athlete_id, date)
);

-- ─── Schedule Events ──────────────────────────────────────────────────────────
create table schedule_events (
  id        bigserial primary key,
  team_id   bigint references teams on delete cascade,
  name      text not null,
  date      date not null,
  time      text default '',
  type      text not null default 'Practice',  -- 'Practice' | 'Competition Week' | 'Competition'
  priority  int not null default 1,
  created_at timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Coaches can only read/write data for teams they belong to.

alter table teams           enable row level security;
alter table team_members    enable row level security;
alter table seasons         enable row level security;
alter table athletes        enable row level security;
alter table eval_log        enable row level security;
alter table na_skills       enable row level security;
alter table stunt_groups    enable row level security;
alter table group_slots     enable row level security;
alter table group_log       enable row level security;
alter table pyramids        enable row level security;
alter table pyramid_sections enable row level security;
alter table pyramid_layers  enable row level security;
alter table pyramid_slots   enable row level security;
alter table attendance      enable row level security;
alter table schedule_events enable row level security;

-- Helper: is the current user a member of this team?
create or replace function is_team_member(p_team_id bigint)
returns boolean language sql security definer as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) or exists (
    select 1 from teams
    where id = p_team_id and owner_id = auth.uid()
  );
$$;

-- Teams
create policy "team_select" on teams for select using (is_team_member(id));
create policy "team_insert" on teams for insert with check (owner_id = auth.uid());
create policy "team_update" on teams for update using (is_team_member(id));
create policy "team_delete" on teams for delete using (owner_id = auth.uid());

-- Apply member-based RLS to all team-scoped tables
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'seasons','athletes','eval_log','na_skills','stunt_groups',
    'group_log','pyramids','schedule_events','attendance'
  ] loop
    execute format('create policy "%s_all" on %s for all using (is_team_member(team_id))', tbl, tbl);
  end loop;
end;
$$;

-- Slot tables don't have team_id — they're accessible if parent is accessible (rely on cascade)
create policy "group_slots_all" on group_slots for all using (
  exists (select 1 from stunt_groups sg where sg.id = group_id and is_team_member(sg.team_id))
);
create policy "pyramid_sections_all" on pyramid_sections for all using (
  exists (select 1 from pyramids p where p.id = pyramid_id and is_team_member(p.team_id))
);
create policy "pyramid_layers_all" on pyramid_layers for all using (
  exists (select 1 from pyramid_sections ps join pyramids p on p.id = ps.pyramid_id where ps.id = section_id and is_team_member(p.team_id))
);
create policy "pyramid_slots_all" on pyramid_slots for all using (
  exists (
    select 1 from pyramid_layers pl
    join pyramid_sections ps on ps.id = pl.section_id
    join pyramids p on p.id = ps.pyramid_id
    where pl.id = layer_id and is_team_member(p.team_id)
  )
);
create policy "team_members_all" on team_members for all using (
  user_id = auth.uid() or is_team_member(team_id)
);
