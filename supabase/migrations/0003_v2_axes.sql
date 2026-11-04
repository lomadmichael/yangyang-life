-- 0003: v2 확장 — 장소 7분류·편의, 놀거리 분류·운영 계절, 편집(editor) 역할, 이야기(stories), 팁 대상 story
--
-- 권한 모델은 0002 그대로:
--   * 원본 테이블(새 stories 포함)은 anon/authenticated 권한 0, RLS 켜 둔 채 정책 0개.
--   * 공개 창구는 security definer 뷰(*_public, 소유자 postgres)뿐. anon 에게는 뷰 SELECT 만.
--   * 쓰기는 service role(서버 액션)만.
-- 뷰는 create or replace 로 갱신한다 — 기존 칸의 이름·순서·타입은 그대로 두고 새 칸은 맨 끝에만 붙인다
-- (drop 하지 않으므로 기존 권한도 유지되지만, 0002 와 같은 owner·revoke·grant 문을 다시 적어 둔다).
--
-- 한 트랜잭션: 중간에 하나라도 실패하면 전부 되돌린다.

begin;

-- ───────────────────────── 1) 장소: 분류 7종 + 편의 ─────────────────────────
-- 순서: 옛 check 삭제 → 옛 값 shop 을 life 로 옮김 → 새 check. (옛 check 가 남아 있으면 update 가 실패해 전체 롤백)
alter table public.places drop constraint places_category_check;
update public.places set category = 'life' where category = 'shop';
alter table public.places add constraint places_category_check
  check (category in ('food', 'cafe', 'stay', 'surf', 'bar', 'spot', 'life'));

-- 편의: 화장실·샤워장 (주차는 기존 parking 칸)
alter table public.places add column amenities text[] not null default '{}';
alter table public.places add constraint places_amenities_check
  check (amenities <@ array['toilet', 'shower']::text[]);

-- ───────────────────────── 2) 놀거리: 분류 8종 + 운영 계절 ─────────────────────────
-- 기본값 'village' 는 v1 배포본 관리 화면(분류 칸이 아직 없음)이 새 할 거리를 넣을 때 not null 에 막히지 않게 하려는 것.
-- 기존 행은 아래 규칙으로 다시 채운다(요가가 먼저, 그다음 기간 행사 → 축제·행사, 나머지 마을·농촌 체험).
alter table public.activities add column category text default 'village';
update public.activities set category = case
  when title_ko like '%요가%' then 'yoga'
  when kind = 'dated' then 'festival'
  else 'village'
end;
alter table public.activities alter column category set not null;
alter table public.activities add constraint activities_category_check
  check (category in ('surf', 'festival', 'eco', 'hike', 'fishing', 'walk', 'yoga', 'village'));

-- 운영하는 달(1~12). 빈 배열 = 사계절
alter table public.activities add column season_months smallint[] not null default '{}';
alter table public.activities add constraint activities_season_months_check
  check (season_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[]);

-- ───────────────────────── 3) 기여자 역할: editor 추가 ─────────────────────────
alter table public.contributors drop constraint contributors_role_check;
alter table public.contributors add constraint contributors_role_check
  check (role in ('owner', 'editor', 'member'));

-- ───────────────────────── 4) 이야기 ─────────────────────────
-- 본문은 blocks jsonb 배열 하나. 「들른 곳」 블록은 장소·놀거리 id 만 저장하고 화면은 현재 값으로 그린다.
-- 블록 하나하나의 모양(stop 은 place_id·activity_id 중 정확히 하나 등)은 서버 액션 입력 검사가 책임진다.
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  type text not null check (type in ('course', 'people', 'guide')),
  guide_topic text,
  title_ko text not null,
  title_en text,
  summary_ko text,
  summary_en text,
  cover_photo text,
  visited_on date,
  tags text[] not null default '{}' check (tags <@ array['solo', 'couple', 'family', 'nocar', 'rainy']::text[]),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'review', 'returned', 'published')),
  review_note text,
  author_id uuid references public.contributors(id) on delete set null,
  published_at timestamptz,
  verified_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 가이드는 주제(놀거리 분류 키 등)가 있어야 하고, 가이드가 아니면 주제가 없다
  check ((type = 'guide') = (guide_topic is not null)),
  -- 공개된 이야기는 공개 시각이 있다(공개 뷰의 published_at 은 항상 채워짐)
  check (status <> 'published' or published_at is not null)
);

create trigger stories_updated_at before update on public.stories
  for each row execute function public.set_updated_at();

-- 역조회(이 장소·놀거리가 나오는 이야기): blocks @> '[{"place_id":"…"}]'
create index stories_blocks_gin on public.stories using gin (blocks jsonb_path_ops);
-- 외래키 인덱스 (성능 advisor)
create index stories_author_id_idx on public.stories (author_id);
create index stories_status_published_idx on public.stories (status, published_at desc);

alter table public.stories enable row level security;
revoke all on public.stories from anon, authenticated;

-- ───────────────────────── 5) 팁 대상: story 추가 ─────────────────────────
alter table public.tips drop constraint tips_target_type_check;
alter table public.tips add constraint tips_target_type_check
  check (target_type in ('place', 'activity', 'story'));

-- ───────────────────────── 6) 공개 뷰 ─────────────────────────
-- 장소: 0002 정의 그대로 + 맨 끝에 amenities
create or replace view public.places_public as
select
  p.id, p.code, p.slug, p.category, p.status, p.name_ko, p.name_en, p.name_roman,
  p.summary_ko, p.summary_en, p.address_ko, p.lat, p.lng, p.hours, p.price_level,
  p.parking, p.foreign_card, p.how_to_get_ko, p.how_to_get_en,
  case when p.status = 'participating' then p.photos else '{}'::text[] end as photos,
  p.verified_method, p.verified_at,
  v.display_name as verified_by_name,
  c.display_name as created_by_name,
  (p.status = 'participating' and exists (
    select 1 from public.menu_items m
    where m.place_id = p.id and coalesce(btrim(m.name_en), '') <> ''
  )) as has_english_menu,
  p.is_sample,
  p.amenities
from public.places p
left join public.contributors v on v.id = p.verified_by
left join public.contributors c on c.id = p.created_by;

-- 놀거리: 0002 정의 그대로 + 맨 끝에 category, season_months
create or replace view public.activities_public as
select
  a.id, a.kind, a.title_ko, a.title_en, a.desc_ko, a.desc_en, a.place_id,
  a.location_ko, a.location_en, a.starts_on, a.ends_on, a.weekdays,
  a.time_note_ko, a.time_note_en, a.rainy_ok, a.link,
  a.verified_method, a.verified_at,
  v.display_name as verified_by_name,
  c.display_name as created_by_name,
  a.is_sample,
  a.category,
  a.season_months
from public.activities a
left join public.contributors v on v.id = a.verified_by
left join public.contributors c on c.id = a.created_by;

-- 이야기: 공개된 것만. 검토 메모(review_note)·상태(status)는 빠진다.
-- 작성자 이름·팀은 show 와 무관하게 표기(장소의 확인자·등록자 이름과 같은 원칙 — 글쓴이 표기)
create view public.stories_public as
select
  s.id, s.slug, s.type, s.guide_topic, s.title_ko, s.title_en, s.summary_ko, s.summary_en,
  s.cover_photo, s.visited_on, s.tags, s.blocks, s.author_id,
  c.display_name as author_name,
  c.team as author_team,
  s.published_at, s.verified_at, s.is_sample
from public.stories s
left join public.contributors c on c.id = s.author_id
where s.status = 'published';

-- 팁: 0002 정의 그대로, is_sample 판정에 이야기 대상만 더한다
create or replace view public.tips_public as
select t.id, t.target_type, t.target_id, t.kind, t.body, t.nickname, t.lang, t.created_at,
  (t.handled_at is not null) as handled,
  coalesce(p.is_sample, a.is_sample, s.is_sample, false) as is_sample
from public.tips t
left join public.places p on t.target_type = 'place' and p.id = t.target_id
left join public.activities a on t.target_type = 'activity' and a.id = t.target_id
left join public.stories s on t.target_type = 'story' and s.id = t.target_id
where t.hidden = false;

alter view public.places_public owner to postgres;
alter view public.activities_public owner to postgres;
alter view public.stories_public owner to postgres;
alter view public.tips_public owner to postgres;

revoke all on public.places_public, public.activities_public, public.stories_public, public.tips_public
  from anon, authenticated;
grant select on public.places_public, public.activities_public, public.stories_public, public.tips_public
  to anon, authenticated;

commit;
