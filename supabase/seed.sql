-- 양양생활 샘플 데이터 — 전부 is_sample = true (YL_SHOW_SAMPLES=1 일 때만 화면에 보임)
-- 고정 UUID + on conflict do nothing → 여러 번 돌려도 안전. places.code 는 기본값으로 자동 생성.
-- 가게·할 거리 이름/주소/좌표는 모두 지어낸 샘플 값이다(실제 가게 아님).

-- 기여자 3명 (접속 코드는 Task 6 에서 발급 → access_code_hash 는 비워 둠)
--   003 은 show=false(「만든 사람들」에서 빠짐) — 그래도 확인한 가게의 확인자 이름으로는 표기돼야 함
insert into public.contributors (id, display_name, team, role_label, cohort, show, role, is_sample) values
  ('00000000-0000-4000-8000-000000000001', '이홍래', '운영', 'PM', null, true, 'owner', true),
  ('00000000-0000-4000-8000-000000000002', '김샘플', '샘플팀', '현장 조사', '샘플기', true, 'member', true),
  ('00000000-0000-4000-8000-000000000003', '박숨김', '샘플팀', '현장 조사', '샘플기', false, 'member', true)
on conflict (id) do nothing;

-- 가게 4곳: 참여 2 · 일반 1 · 휴업 1 (그중 바 1곳은 금·토 18:00~02:00)
insert into public.places (id, slug, category, status, name_ko, name_en, name_roman, summary_ko, summary_en,
  address_ko, lat, lng, hours, price_level, parking, foreign_card, how_to_get_ko, how_to_get_en, photos,
  verified_method, verified_at, verified_by, created_by, is_sample) values
  ('00000000-0000-4000-8000-000000000101', 'sample-noodle-house', 'food', 'participating',
   '샘플 막국수집', 'Sample Noodle House', 'Saempeul Makguksu-jip',
   '메밀 막국수와 수육을 파는 샘플 가게', 'A sample shop serving buckwheat noodles and boiled pork',
   '강원특별자치도 양양군 현남면 샘플로 1', 37.9712, 128.7601,
   '{"mon":[["11:00","20:00"]],"tue":[["11:00","20:00"]],"thu":[["11:00","20:00"]],"fri":[["11:00","20:00"]],"sat":[["11:00","20:00"]],"sun":[["11:00","19:00"]]}',
   1, true, true, '버스 정류장에서 걸어서 5분 (샘플)', '5-minute walk from the bus stop (sample)', '{https://example.com/sample-noodle.jpg}',
   'visit', '2026-10-30T10:00:00+09:00', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', true),
  ('00000000-0000-4000-8000-000000000102', 'sample-night-bar', 'bar', 'participating',
   '샘플 밤바다 바', 'Sample Night Sea Bar', 'Saempeul Bambada Ba',
   '금·토 밤에만 여는 샘플 바', 'A sample bar open only on Friday and Saturday nights',
   '강원특별자치도 양양군 현남면 샘플로 2', 37.9725, 128.7612,
   '{"fri":[["18:00","02:00"]],"sat":[["18:00","02:00"]]}',
   2, false, true, '해변 산책로 끝 (샘플)', 'At the end of the beach promenade (sample)', '{}',
   'interview', '2026-10-31T19:00:00+09:00', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', true),
  ('00000000-0000-4000-8000-000000000103', 'sample-beach-cafe', 'cafe', 'listed',
   '샘플 바닷가 카페', 'Sample Beach Cafe', 'Saempeul Badatga Kape',
   '바다가 보이는 샘플 카페', 'A sample cafe with a sea view',
   '강원특별자치도 양양군 양양읍 샘플로 3', 38.0754, 128.6190,
   '{"mon":[["09:00","18:00"]],"tue":[["09:00","18:00"]],"wed":[["09:00","18:00"]],"thu":[["09:00","18:00"]],"fri":[["09:00","18:00"]],"sat":[["09:00","21:00"]],"sun":[["09:00","21:00"]]}',
   2, null, null, null, null, '{https://example.com/sample-cafe.jpg}',
   'visit', '2026-10-27T15:00:00+09:00', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', true),
  ('00000000-0000-4000-8000-000000000104', 'sample-surf-shop', 'surf', 'closed',
   '샘플 서핑숍 (휴업)', 'Sample Surf Shop (closed)', 'Saempeul Seoping-sop',
   '겨울 휴업 중인 샘플 서핑숍', 'A sample surf shop closed for winter',
   '강원특별자치도 양양군 현남면 샘플로 4', 37.9690, 128.7630,
   '{}', 3, true, false, null, null, '{}',
   'phone', '2026-10-28T14:00:00+09:00', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', true)
on conflict (id) do nothing;

-- 참여 가게 메뉴 6개 (영문 1개는 일부러 빈칸) + 일반(listed) 카페 메뉴 1개(공개 뷰에서 빠져야 함)
insert into public.menu_items (id, place_id, sort, name_ko, name_roman, name_en, desc_en, price, allergens, vegan, spicy) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 1, '물막국수', 'Mul-makguksu', 'Cold Buckwheat Noodles in Broth', 'Chilled broth, sample dish', 10000, '{buckwheat,wheat}', false, 0),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 2, '비빔막국수', 'Bibim-makguksu', 'Spicy Mixed Buckwheat Noodles', 'Sweet and spicy sauce, sample dish', 10000, '{buckwheat,wheat,sesame}', false, 2),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', 3, '수육', 'Suyuk', 'Boiled Pork Slices', null, 18000, '{pork}', false, 0),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000101', 4, '감자전', 'Gamja-jeon', null, null, 12000, '{}', true, 0),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000102', 1, '수제 맥주', 'Suje maekju', 'Craft Beer', 'Local sample brew', 8000, '{wheat}', true, 0),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000102', 2, '오징어 튀김', 'Ojingeo twigim', 'Fried Squid', null, 15000, '{squid,wheat}', false, 1),
  ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000103', 1, '아메리카노', 'Amerikano', 'Americano', 'Listed (non-participating) cafe — must not be public', 5000, '{}', true, 0)
on conflict (id) do nothing;

-- 할 거리 5건: 진행 중 dated · 끝난 dated · always 평일 · always 주말 · 비 와도 OK (weekdays 0=일 ~ 6=토)
insert into public.activities (id, kind, title_ko, title_en, desc_ko, desc_en, place_id, location_ko, location_en,
  starts_on, ends_on, weekdays, time_note_ko, time_note_en, rainy_ok, link,
  verified_method, verified_at, verified_by, created_by, is_sample) values
  ('00000000-0000-4000-8000-000000000301', 'dated', '샘플 가을 장터', 'Sample Autumn Market',
   '진행 중인 샘플 기간 행사', 'A sample event currently running', null, '샘플 광장', 'Sample Plaza',
   '2026-10-25', '2026-11-30', '{}', '10:00~16:00', '10:00-16:00', false, null,
   'public', '2026-10-25T09:00:00+09:00', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', true),
  ('00000000-0000-4000-8000-000000000302', 'dated', '샘플 여름 축제 (끝남)', 'Sample Summer Festival (ended)',
   '이미 끝난 샘플 행사', 'A sample event that has already ended', null, '샘플 해변', 'Sample Beach',
   '2026-08-01', '2026-08-03', '{}', '종일', 'All day', false, null,
   'public', '2026-07-20T09:00:00+09:00', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', true),
  ('00000000-0000-4000-8000-000000000303', 'always', '샘플 평일 서핑 강습', 'Sample Weekday Surf Lesson',
   '평일마다 하는 샘플 강습', 'A sample lesson held every weekday', '00000000-0000-4000-8000-000000000104', '샘플 서핑숍 앞', 'In front of the sample surf shop',
   null, null, '{1,2,3,4,5}', '오전 10시', '10 AM', false, null,
   'phone', '2026-10-28T14:00:00+09:00', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', true),
  ('00000000-0000-4000-8000-000000000304', 'always', '샘플 주말 해변 요가', 'Sample Weekend Beach Yoga',
   '토·일 아침 샘플 요가', 'Sample yoga on Saturday and Sunday mornings', null, '샘플 해변', 'Sample Beach',
   null, null, '{0,6}', '오전 7시', '7 AM', false, null,
   'visit', '2026-10-26T07:00:00+09:00', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', true),
  ('00000000-0000-4000-8000-000000000305', 'always', '샘플 실내 공방 체험', 'Sample Indoor Craft Workshop',
   '비 오는 날에도 좋은 샘플 실내 체험', 'A sample indoor activity, good on rainy days', '00000000-0000-4000-8000-000000000103', '샘플 바닷가 카페 2층', '2F of the sample beach cafe',
   null, null, '{0,1,2,3,4,5,6}', '13:00~17:00', '1-5 PM', true, null,
   'interview', '2026-10-29T13:00:00+09:00', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', true)
on conflict (id) do nothing;

-- 팁 2건 (샘플 가게 대상 — tips_public.is_sample 이 대상의 is_sample 을 따르므로 샘플 숨김이면 안 나옴)
--   하나는 공개(연락처가 들어 있지만 tips_public 에서 빠지는지 확인용), 하나는 숨김(공개 뷰에 안 나와야 함)
insert into public.tips (id, target_type, target_id, kind, body, nickname, lang, contact, device_id, hidden, handled_at) values
  ('00000000-0000-4000-8000-000000000401', 'place', '00000000-0000-4000-8000-000000000101', 'tip',
   '샘플 팁: 점심엔 줄이 길어요', '샘플손님', 'ko', 'sample-contact@example.com', 'sample-device-1', false, null),
  ('00000000-0000-4000-8000-000000000402', 'place', '00000000-0000-4000-8000-000000000101', 'changed',
   'Sample hidden tip (should never be public)', 'sample', 'en', null, 'sample-device-2', true, '2026-11-01T12:00:00+09:00')
on conflict (id) do nothing;
