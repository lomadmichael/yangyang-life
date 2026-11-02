-- 0002 리뷰 수정분을 이미 seed 가 들어간 DB 에 반영 (seed.sql 은 on conflict do nothing 이라 기존 행은 안 바뀜)
-- 새 DB 라면 seed.sql 만 돌리면 되고 이 파일은 필요 없다 (돌려도 결과 동일)
insert into public.contributors (id, display_name, team, role_label, cohort, show, role, is_sample) values
  ('00000000-0000-4000-8000-000000000003', '박숨김', '샘플팀', '현장 조사', '샘플기', false, 'member', true)
on conflict (id) do nothing;
update public.places set photos = '{https://example.com/sample-noodle.jpg}'
  where id = '00000000-0000-4000-8000-000000000101';
update public.places set photos = '{https://example.com/sample-cafe.jpg}', verified_method = 'visit',
  verified_at = '2026-10-27T15:00:00+09:00', verified_by = '00000000-0000-4000-8000-000000000003'
  where id = '00000000-0000-4000-8000-000000000103';
insert into public.menu_items (id, place_id, sort, name_ko, name_roman, name_en, desc_en, price, allergens, vegan, spicy) values
  ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000103', 1, '아메리카노', 'Amerikano', 'Americano', 'Listed (non-participating) cafe — must not be public', 5000, '{}', true, 0)
on conflict (id) do nothing;
