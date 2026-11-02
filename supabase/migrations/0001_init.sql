-- 양양생활(YANGYANG LIFE) 초기 스키마
--
-- 공개 읽기 보안 모델 (한 가지로 통일):
--   * 모든 테이블 RLS enable. anon/authenticated 의 기본 권한은 전부 REVOKE 한 뒤 필요한 것만 GRANT.
--   * 공개 뷰(places_public · contributors_public · tips_public · menu_items_public · activities_public)는
--     security_invoker = true → 뷰를 읽는 사람(anon)의 권한·RLS 가 그대로 적용된다(RLS 우회 없음).
--   * 그래서 anon 에게는 원본 테이블의 "공개해도 되는 컬럼"만 컬럼 단위로 GRANT 한다.
--     비공개 컬럼(contributors.access_code_hash·role, tips.contact·device_id·report_count)은 GRANT 자체가 없어
--     원본이든 뷰든 어떤 경로로도 anon 이 읽을 수 없다. tip_reports 는 anon 권한 0.
--   * 쓰기 정책은 없다. 쓰기는 전부 service role(서버) 에서만.

-- ───────────────────────── 공통 함수 ─────────────────────────
create or replace function public.gen_place_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  chars constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random() * 36)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.places_code_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code is distinct from old.code then
    raise exception 'places.code 는 생성 후 바꿀 수 없습니다 (% → %)', old.code, new.code;
  end if;
  return new;
end;
$$;

-- ───────────────────────── 테이블 ─────────────────────────
create table public.contributors (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  team text,
  role_label text,
  cohort text,
  show boolean not null default true,
  role text not null default 'member' check (role in ('owner', 'member')),
  access_code_hash text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.gen_place_code() check (code ~ '^[a-z0-9]{6}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('food', 'cafe', 'bar', 'surf', 'shop')),
  status text not null default 'listed' check (status in ('participating', 'listed', 'closed')),
  name_ko text not null,
  name_en text,
  name_roman text,
  summary_ko text,
  summary_en text,
  address_ko text not null,
  lat double precision not null,
  lng double precision not null,
  hours jsonb not null default '{}'::jsonb check (jsonb_typeof(hours) = 'object'),
  price_level smallint not null default 2 check (price_level between 1 and 3),
  parking boolean,
  foreign_card boolean,
  how_to_get_ko text,
  how_to_get_en text,
  photos text[] not null default '{}',
  verified_method text not null default 'public' check (verified_method in ('visit', 'phone', 'interview', 'public')),
  verified_at timestamptz,
  verified_by uuid references public.contributors(id) on delete set null,
  created_by uuid references public.contributors(id) on delete set null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger places_code_immutable before update on public.places
  for each row execute function public.places_code_immutable();
create trigger places_updated_at before update on public.places
  for each row execute function public.set_updated_at();

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  sort int not null default 0,
  name_ko text not null,
  name_roman text,
  name_en text,
  desc_en text,
  price int check (price is null or price >= 0),
  allergens text[] not null default '{}',
  vegan boolean not null default false,
  spicy smallint not null default 0 check (spicy between 0 and 3),
  created_at timestamptz not null default now()
);
create index menu_items_place_idx on public.menu_items (place_id, sort);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dated', 'always')),
  title_ko text not null,
  title_en text,
  desc_ko text,
  desc_en text,
  place_id uuid references public.places(id) on delete set null,
  location_ko text,
  location_en text,
  starts_on date,
  ends_on date,
  weekdays smallint[] not null default '{}' check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  time_note_ko text,
  time_note_en text,
  rainy_ok boolean not null default false,
  link text,
  verified_method text not null default 'public' check (verified_method in ('visit', 'phone', 'interview', 'public')),
  verified_at timestamptz,
  verified_by uuid references public.contributors(id) on delete set null,
  created_by uuid references public.contributors(id) on delete set null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'dated' or starts_on is not null),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index activities_place_idx on public.activities (place_id);
create trigger activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('place', 'activity')),
  target_id uuid not null,
  kind text not null check (kind in ('changed', 'tip', 'directions')),
  body text not null check (char_length(body) between 1 and 2000),
  nickname text check (nickname is null or char_length(nickname) <= 40),
  lang text not null check (lang in ('ko', 'en')),
  contact text,
  device_id text,
  hidden boolean not null default false,
  report_count int not null default 0,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index tips_target_idx on public.tips (target_type, target_id, created_at desc);

create table public.tip_reports (
  tip_id uuid not null references public.tips(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  unique (tip_id, device_id)
);

-- 외래키 인덱스 (성능 advisor)
create index places_verified_by_idx on public.places (verified_by);
create index places_created_by_idx on public.places (created_by);
create index activities_verified_by_idx on public.activities (verified_by);
create index activities_created_by_idx on public.activities (created_by);

-- ───────────────────────── RLS ─────────────────────────
alter table public.contributors enable row level security;
alter table public.places enable row level security;
alter table public.menu_items enable row level security;
alter table public.activities enable row level security;
alter table public.tips enable row level security;
alter table public.tip_reports enable row level security;

-- Supabase 기본 권한(anon/authenticated 에 ALL) 제거
revoke all on public.contributors, public.places, public.menu_items, public.activities,
  public.tips, public.tip_reports from anon, authenticated;
revoke execute on function public.gen_place_code(), public.set_updated_at(), public.places_code_immutable()
  from public, anon, authenticated;

-- 공개 컬럼만 GRANT (공개 뷰가 invoker 권한으로 읽을 수 있게)
grant select (id, display_name, team, role_label, cohort, show, is_sample)
  on public.contributors to anon, authenticated;
grant select (id, code, slug, category, status, name_ko, name_en, name_roman, summary_ko, summary_en,
  address_ko, lat, lng, hours, price_level, parking, foreign_card, how_to_get_ko, how_to_get_en, photos,
  verified_method, verified_at, verified_by, created_by, is_sample, created_at, updated_at)
  on public.places to anon, authenticated;
grant select (id, place_id, sort, name_ko, name_roman, name_en, desc_en, price, allergens, vegan, spicy)
  on public.menu_items to anon, authenticated;
grant select (id, kind, title_ko, title_en, desc_ko, desc_en, place_id, location_ko, location_en,
  starts_on, ends_on, weekdays, time_note_ko, time_note_en, rainy_ok, link,
  verified_method, verified_at, verified_by, created_by, is_sample, created_at, updated_at)
  on public.activities to anon, authenticated;
grant select (id, target_type, target_id, kind, body, nickname, lang, created_at, handled_at, hidden)
  on public.tips to anon, authenticated;
-- tip_reports: anon 권한 없음

-- 읽기 정책 (쓰기 정책 없음)
-- contributors: 이름은 가게·할 거리의 확인자/등록자로 노출되므로 행 단위 제한 없음(비공개 컬럼은 GRANT 없음).
--   크레딧 목록에서 show=false 를 빼는 것은 contributors_public 뷰가 한다.
create policy contributors_read on public.contributors for select to anon, authenticated using (true);
create policy places_read on public.places for select to anon, authenticated using (true);
create policy menu_items_read on public.menu_items for select to anon, authenticated using (true);
create policy activities_read on public.activities for select to anon, authenticated using (true);
create policy tips_read on public.tips for select to anon, authenticated using (hidden = false);

-- ───────────────────────── 공개 뷰 ─────────────────────────
create view public.places_public with (security_invoker = true) as
select
  p.id, p.code, p.slug, p.category, p.status, p.name_ko, p.name_en, p.name_roman,
  p.summary_ko, p.summary_en, p.address_ko, p.lat, p.lng, p.hours, p.price_level,
  p.parking, p.foreign_card, p.how_to_get_ko, p.how_to_get_en, p.photos,
  p.verified_method, p.verified_at,
  v.display_name as verified_by_name,
  c.display_name as created_by_name,
  exists (
    select 1 from public.menu_items m
    where m.place_id = p.id and coalesce(btrim(m.name_en), '') <> ''
  ) as has_english_menu,
  p.is_sample
from public.places p
left join public.contributors v on v.id = p.verified_by
left join public.contributors c on c.id = p.created_by;

create view public.menu_items_public with (security_invoker = true) as
select m.id, m.place_id, m.sort, m.name_ko, m.name_roman, m.name_en, m.desc_en, m.price,
  m.allergens, m.vegan, m.spicy, p.is_sample
from public.menu_items m
join public.places p on p.id = m.place_id;

create view public.activities_public with (security_invoker = true) as
select
  a.id, a.kind, a.title_ko, a.title_en, a.desc_ko, a.desc_en, a.place_id,
  a.location_ko, a.location_en, a.starts_on, a.ends_on, a.weekdays,
  a.time_note_ko, a.time_note_en, a.rainy_ok, a.link,
  a.verified_method, a.verified_at,
  v.display_name as verified_by_name,
  c.display_name as created_by_name,
  a.is_sample
from public.activities a
left join public.contributors v on v.id = a.verified_by
left join public.contributors c on c.id = a.created_by;

create view public.contributors_public with (security_invoker = true) as
select id, display_name, team, role_label, cohort, show, is_sample
from public.contributors
where show = true;

create view public.tips_public with (security_invoker = true) as
select id, target_type, target_id, kind, body, nickname, lang, created_at,
  (handled_at is not null) as handled
from public.tips
where hidden = false;

revoke all on public.places_public, public.menu_items_public, public.activities_public,
  public.contributors_public, public.tips_public from anon, authenticated;
grant select on public.places_public, public.menu_items_public, public.activities_public,
  public.contributors_public, public.tips_public to anon, authenticated;
