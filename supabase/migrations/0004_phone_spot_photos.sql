-- 0004: 장소 전화번호 + 해변·명소 사진 공개
--
-- 권한 모델은 0002·0003 그대로 (원본 테이블 anon 권한 0, 공개 창구는 security definer 뷰 *_public 뿐).
-- places_public 은 create or replace — 기존 칸의 이름·순서·타입은 그대로, 새 칸 phone 은 맨 끝에만 붙인다.
--   * photos 칸: 이름·타입(text[])은 그대로 두고 노출 규칙만 넓힌다.
--     전: 참여 가게(status='participating')만 / 후: 참여 가게 또는 해변·명소(category='spot')
--     해변·명소는 가게가 아니라 동의할 사장님이 없고, 사진은 운영진이 찍은 풍경이라 공개해도 된다.
--   * 앱 화면의 같은 판정: src/lib/place-photos.ts (canShowPlacePhotos)
--
-- 한 트랜잭션: 중간에 하나라도 실패하면 전부 되돌린다.

begin;

-- ───────────────────────── 1) 장소 전화번호 ─────────────────────────
-- 비어 있어도 된다(null). 숫자·하이픈만, 8~20자 (예: 033-671-1234, 010-1234-5678)
alter table public.places add column phone text;
alter table public.places add constraint places_phone_check
  check (phone is null or (phone ~ '^[0-9-]+$' and char_length(phone) between 8 and 20));

-- ───────────────────────── 2) 공개 뷰 ─────────────────────────
-- 장소: 0003 정의 그대로 + photos 노출 규칙 변경 + 맨 끝에 phone
create or replace view public.places_public as
select
  p.id, p.code, p.slug, p.category, p.status, p.name_ko, p.name_en, p.name_roman,
  p.summary_ko, p.summary_en, p.address_ko, p.lat, p.lng, p.hours, p.price_level,
  p.parking, p.foreign_card, p.how_to_get_ko, p.how_to_get_en,
  case when p.status = 'participating' or p.category = 'spot' then p.photos else '{}'::text[] end as photos,
  p.verified_method, p.verified_at,
  v.display_name as verified_by_name,
  c.display_name as created_by_name,
  (p.status = 'participating' and exists (
    select 1 from public.menu_items m
    where m.place_id = p.id and coalesce(btrim(m.name_en), '') <> ''
  )) as has_english_menu,
  p.is_sample,
  p.amenities,
  p.phone
from public.places p
left join public.contributors v on v.id = p.verified_by
left join public.contributors c on c.id = p.created_by;

alter view public.places_public owner to postgres;

revoke all on public.places_public from anon, authenticated;
grant select on public.places_public to anon, authenticated;

commit;
