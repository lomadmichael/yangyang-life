-- 0002: anon 은 공개 뷰만 읽는다 (리뷰 1차 수정)
--
-- 보안 모델 변경 (0001 의 security_invoker + 컬럼 GRANT 방식 폐기):
--   * anon / authenticated 는 원본 테이블에 아무 권한도 없다 (REVOKE ALL, 읽기 정책 삭제).
--     RLS 는 켜 둔 채 정책 0개 → PostgREST 로 원본을 읽으면 permission denied.
--   * 공개 뷰는 security definer 뷰(소유자 postgres, security_invoker 없음)로 되돌린다.
--     anon 에게는 뷰 SELECT 만 GRANT. 뷰가 모든 필터(show=true, hidden=false, 참여 가게 한정 등)와
--     컬럼 선택을 직접 책임진다 — 뷰에 없는 컬럼·행은 어떤 경로로도 anon 에게 닿지 않는다.
--   * advisor 의 security_definer_view(0010) 경고는 의도된 것:
--     원본 테이블 권한을 0 으로 두고 "뷰 = 유일한 공개 창구"로 쓰려면 definer 뷰가 필요하다.
--     invoker 뷰로 하려면 anon 에게 원본 테이블 권한을 줘야 하고, 그러면 원본을 직접 읽어
--     뷰의 필터(show=false 제외·샘플 필터·참여 가게 한정)를 우회할 수 있다(0001 리뷰에서 지적된 누수).
--   * 쓰기는 여전히 service role 만.

-- 1) 원본 테이블: anon/authenticated 권한 전부 제거 + 읽기 정책 삭제
revoke all on public.contributors, public.places, public.menu_items, public.activities,
  public.tips, public.tip_reports from anon, authenticated;

drop policy if exists contributors_read on public.contributors;
drop policy if exists places_read on public.places;
drop policy if exists menu_items_read on public.menu_items;
drop policy if exists activities_read on public.activities;
drop policy if exists tips_read on public.tips;

-- 2) 공개 뷰 재생성 (definer 뷰)
drop view if exists public.places_public, public.menu_items_public, public.activities_public,
  public.contributors_public, public.tips_public;

-- 가게: 사진·영문 메뉴 여부는 참여 가게(participating)만. 확인자·등록자 이름은 show 와 무관하게 표기(확인 표기 요구)
create view public.places_public as
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
  p.is_sample
from public.places p
left join public.contributors v on v.id = p.verified_by
left join public.contributors c on c.id = p.created_by;

-- 메뉴: 참여 가게 것만
create view public.menu_items_public as
select m.id, m.place_id, m.sort, m.name_ko, m.name_roman, m.name_en, m.desc_en, m.price,
  m.allergens, m.vegan, m.spicy, p.is_sample
from public.menu_items m
join public.places p on p.id = m.place_id
where p.status = 'participating';

create view public.activities_public as
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

-- 「만든 사람들」: show=false 는 이름·팀·역할·기수 전부 빠진다
create view public.contributors_public as
select id, display_name, team, role_label, cohort, show, is_sample
from public.contributors
where show = true;

-- 팁: 숨김 제외, 연락처·기기·신고수 제외. is_sample = 대상(가게·할 거리)의 is_sample, 대상이 없으면 false
create view public.tips_public as
select t.id, t.target_type, t.target_id, t.kind, t.body, t.nickname, t.lang, t.created_at,
  (t.handled_at is not null) as handled,
  coalesce(p.is_sample, a.is_sample, false) as is_sample
from public.tips t
left join public.places p on t.target_type = 'place' and p.id = t.target_id
left join public.activities a on t.target_type = 'activity' and a.id = t.target_id
where t.hidden = false;

alter view public.places_public owner to postgres;
alter view public.menu_items_public owner to postgres;
alter view public.activities_public owner to postgres;
alter view public.contributors_public owner to postgres;
alter view public.tips_public owner to postgres;

revoke all on public.places_public, public.menu_items_public, public.activities_public,
  public.contributors_public, public.tips_public from anon, authenticated;
grant select on public.places_public, public.menu_items_public, public.activities_public,
  public.contributors_public, public.tips_public to anon, authenticated;
