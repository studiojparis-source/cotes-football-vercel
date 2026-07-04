create table if not exists public.matches (
  id bigint generated always as identity primary key,
  match_date date,
  season text not null,
  championnat text not null,
  home text not null,
  away text not null,
  o1 numeric(8, 3) not null,
  ox numeric(8, 3) not null,
  o2 numeric(8, 3) not null,
  fthg integer not null,
  ftag integer not null,
  hthg integer not null,
  htag integer not null,
  score text not null,
  score_mt text not null,
  resultat text not null,
  over15 boolean not null,
  under15 boolean not null,
  over25 boolean not null,
  under25 boolean not null,
  over35 boolean not null,
  under35 boolean not null,
  btts boolean not null,
  btts_non boolean not null,
  home_over05 boolean not null,
  home_under05 boolean not null,
  away_over05 boolean not null,
  away_under05 boolean not null,
  dc_1x boolean not null,
  dc_x2 boolean not null,
  dc_12 boolean not null,
  nul_mt boolean not null,
  homewin_mt boolean not null,
  awaywin_mt boolean not null,
  buts_1mt integer not null,
  buts_2mt integer not null,
  mt_prolifique text not null,
  source text not null default 'football-data.co.uk',
  created_at timestamptz not null default now(),
  unique (match_date, championnat, home, away, o1, ox, o2, score)
);

create table if not exists public.imports (
  id bigint generated always as identity primary key,
  source text not null,
  championnat text not null,
  season text not null,
  rows_imported integer not null default 0,
  created_at timestamptz not null default now(),
  unique (source, championnat, season)
);

alter table public.matches enable row level security;
alter table public.imports enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.matches to anon, authenticated;
grant select on public.imports to anon, authenticated;

drop policy if exists "Public read matches" on public.matches;
create policy "Public read matches"
on public.matches
for select
to anon, authenticated
using (true);

drop policy if exists "Public read imports" on public.imports;
create policy "Public read imports"
on public.imports
for select
to anon, authenticated
using (true);

create index if not exists matches_championnat_idx on public.matches (championnat);
create index if not exists matches_season_idx on public.matches (season);
create index if not exists matches_odds_idx on public.matches (o1, ox, o2);
create index if not exists matches_date_idx on public.matches (match_date);
