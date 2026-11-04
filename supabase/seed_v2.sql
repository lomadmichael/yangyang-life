-- 양양생활 v2 샘플 데이터 — 0003 적용 후, seed.sql 다음에 실행. 전부 is_sample = true
-- 고정 UUID + on conflict do nothing / 같은 값으로 덮는 update → 여러 번 돌려도 안전.
-- 이름은 PRD v2 §6 더미 상황 그대로(모두 지어낸 값, 실제 업체·사람 아님).
-- seed.sql 의 샘플 행(…0101~0104 장소, …0301~0305 할 거리, …0002 기여자)은 id·slug·code 를 그대로 두고
-- 이름만 §6 이름으로 바꾼다 — 이야기의 「들른 곳」 카드는 현재 장소 값을 그리므로 본문 이름과 맞춰야 한다.

-- ───────────────────────── 기여자 ─────────────────────────
-- 접속 코드는 발급 전 → access_code_hash 는 비워 둠(null)
insert into public.contributors (id, display_name, team, role_label, cohort, show, role, is_sample) values
  ('00000000-0000-4000-8000-000000000004', '한유나', '현장조사팀', '영어 콘텐츠', '4기', true, 'member', true),
  ('00000000-0000-4000-8000-000000000005', '박하늘', '운영', '심화편 PM', '4기', true, 'editor', true)
on conflict (id) do nothing;

-- 기존 샘플 기여자 김샘플 → 윤서진 (이야기 「비 오는 날 차 없이 현남 하루」 글쓴이)
update public.contributors set display_name = '윤서진', team = '현장조사·영어 콘텐츠팀', role_label = '현장 조사', cohort = '4기'
where id = '00000000-0000-4000-8000-000000000002' and is_sample;

-- ───────────────────────── 기존 샘플 장소 이름 (§6) ─────────────────────────
update public.places set name_ko = '솔밭 막국수', name_en = 'Solbat Makguksu', name_roman = 'Solbat Makguksu',
  how_to_get_ko = '죽도해변 버스 정류장에서 걸어서 5분', how_to_get_en = '5-minute walk from the Jukdo Beach bus stop'
where id = '00000000-0000-4000-8000-000000000101' and is_sample;
update public.places set name_ko = '파도소리 펍', name_en = 'Padosori Pub', name_roman = 'Padosori Peop'
where id = '00000000-0000-4000-8000-000000000102' and is_sample;
update public.places set name_ko = '모래언덕 카페', name_en = 'Sand Dune Cafe', name_roman = 'Moraeeondeok Kape'
where id = '00000000-0000-4000-8000-000000000103' and is_sample;
update public.places set name_ko = '바람길 서핑하우스', name_en = 'Baramgil Surf House', name_roman = 'Baramgil Seoping-hauseu',
  summary_ko = '겨울 휴업 중인 서핑샵 (샘플)', summary_en = 'A surf shop closed for winter (sample)'
where id = '00000000-0000-4000-8000-000000000104' and is_sample;

-- ───────────────────────── 새 샘플 장소: 해변·명소 1 · 생활 편의 1 ─────────────────────────
insert into public.places (id, slug, category, status, name_ko, name_en, name_roman, summary_ko, summary_en,
  address_ko, lat, lng, hours, price_level, parking, foreign_card, how_to_get_ko, how_to_get_en, photos,
  amenities, verified_method, verified_at, verified_by, created_by, is_sample) values
  ('00000000-0000-4000-8000-000000000105', 'sample-jukdo-beach', 'spot', 'listed',
   '죽도해변', 'Jukdo Beach', 'Jukdo Haebyeon',
   '서핑하는 사람이 많은 현남의 해변 (샘플)', 'A Hyeonnam beach popular with surfers (sample)',
   '강원특별자치도 양양군 현남면 샘플로 5', 37.9706, 128.7618,
   '{}', 1, true, null, '죽도해변 버스 정류장 바로 앞 (샘플)', 'Right by the Jukdo Beach bus stop (sample)', '{}',
   '{toilet,shower}', 'visit', '2026-11-10T10:00:00+09:00',
   '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', true),
  ('00000000-0000-4000-8000-000000000106', 'sample-hyeonnam-hanaro', 'life', 'listed',
   '현남 하나로마트', 'Hyeonnam Hanaro Mart', 'Hyeonnam Hanaro Mateu',
   '장보기·생활용품 (샘플)', 'Groceries and daily goods (sample)',
   '강원특별자치도 양양군 현남면 샘플로 6', 37.9741, 128.7580,
   '{"mon":[["09:00","21:00"]],"tue":[["09:00","21:00"]],"wed":[["09:00","21:00"]],"thu":[["09:00","21:00"]],"fri":[["09:00","21:00"]],"sat":[["09:00","21:00"]],"sun":[["09:00","20:00"]]}',
   1, true, true, null, null, '{}',
   '{}', 'phone', '2026-11-10T11:00:00+09:00',
   '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', true)
on conflict (id) do nothing;

-- ───────────────────────── 놀거리 분류·계절 (기존 샘플) ─────────────────────────
update public.activities set category = 'festival', title_ko = '가을 장터', title_en = 'Autumn Market'
where id = '00000000-0000-4000-8000-000000000301' and is_sample;
update public.activities set category = 'festival'
where id = '00000000-0000-4000-8000-000000000302' and is_sample;
-- 「초보 서핑 강습」: 운영 4~10월, 바람길 서핑하우스(…0104) 연결
update public.activities set category = 'surf', title_ko = '초보 서핑 강습', title_en = 'Beginner Surf Lesson',
  season_months = '{4,5,6,7,8,9,10}', place_id = '00000000-0000-4000-8000-000000000104',
  location_ko = '바람길 서핑하우스 앞', location_en = 'In front of Baramgil Surf House'
where id = '00000000-0000-4000-8000-000000000303' and is_sample;
update public.activities set category = 'yoga', title_ko = '주말 해변 요가', title_en = 'Weekend Beach Yoga'
where id = '00000000-0000-4000-8000-000000000304' and is_sample;
update public.activities set category = 'village', title_ko = '인구 바다유리 공방 체험', title_en = 'Ingu Sea Glass Workshop',
  location_ko = '모래언덕 카페 2층', location_en = '2F of Sand Dune Cafe',
  time_note_ko = '13:00~19:00', time_note_en = '1-7 PM'
where id = '00000000-0000-4000-8000-000000000305' and is_sample;

-- ───────────────────────── 이야기 3편 (모두 공개) ─────────────────────────
-- 「들른 곳」(t=stop)은 place_id·activity_id 중 하나만 채우고 나머지 키는 null 로 적는다.
insert into public.stories (id, slug, type, guide_topic, title_ko, title_en, summary_ko, summary_en, cover_photo,
  visited_on, tags, blocks, status, author_id, published_at, verified_at, is_sample) values
  ('00000000-0000-4000-8000-000000000501', 'sample-rainy-day-no-car', 'course', null,
   '비 오는 날 차 없이 현남 하루', 'A rainy day in Hyeonnam without a car',
   '버스와 두 발로 다닌 현남 하루 코스. 우산 하나면 충분해요.', 'A day in Hyeonnam by bus and on foot. An umbrella is all you need.',
   'https://example.com/sample-story-rainy.jpg',
   '2026-11-07', '{nocar,rainy,solo}',
   '[
     {"t":"text","ko":"비 예보가 있던 날, 차 없이 버스만 타고 현남을 한 바퀴 돌았어요. 비 오는 바다는 조용해서 오히려 좋았어요.","en":"Rain was in the forecast, so I went around Hyeonnam by bus only. The sea in the rain was quiet, which made it even better."},
     {"t":"stop","place_id":"00000000-0000-4000-8000-000000000105","activity_id":null,"time_ko":"오전 10:00","time_en":"10:00 AM","note_ko":"해변 산책. 비 오는 날엔 사람이 적어요","note_en":"A beach walk. Few people on rainy days"},
     {"t":"stop","place_id":"00000000-0000-4000-8000-000000000101","activity_id":null,"time_ko":"점심","time_en":"Lunch","note_ko":"물막국수 한 그릇. 메밀이 들어가요","note_en":"A bowl of cold buckwheat noodles. Contains buckwheat"},
     {"t":"photo","url":"https://example.com/sample-story-noodle.jpg","caption_ko":"따뜻한 육수와 막국수","caption_en":"Warm broth and makguksu"},
     {"t":"text","ko":"점심을 먹고 나니 빗줄기가 굵어져서 실내 체험으로 갔어요.","en":"After lunch the rain got heavier, so I went to an indoor workshop."},
     {"t":"stop","place_id":null,"activity_id":"00000000-0000-4000-8000-000000000305","time_ko":"14:00","time_en":"2 PM","note_ko":"바닷가에서 주운 유리로 작은 장식을 만들어요","note_en":"Make a small ornament from glass found on the beach"},
     {"t":"photo","url":"https://example.com/sample-story-seaglass.jpg","caption_ko":"완성한 바다유리 장식","caption_en":"The finished sea glass ornament"},
     {"t":"stop","place_id":"00000000-0000-4000-8000-000000000104","activity_id":null,"time_ko":"17:00","time_en":"5 PM","note_ko":"따뜻한 차를 마시며 서핑 영상을 봤어요","note_en":"Watched surf videos over a warm tea"},
     {"t":"stop","place_id":"00000000-0000-4000-8000-000000000102","activity_id":null,"time_ko":"저녁","time_en":"Evening","note_ko":"하루 마무리는 수제 맥주 한 잔","note_en":"Ended the day with a craft beer"},
     {"t":"text","ko":"버스 배차가 길어서 시간표를 미리 보고 움직이는 게 좋아요.","en":"Buses run infrequently, so check the timetable before you move."}
   ]'::jsonb,
   'published', '00000000-0000-4000-8000-000000000002', '2026-11-08T20:00:00+09:00', null, true),
  ('00000000-0000-4000-8000-000000000502', 'sample-buckwheat-family', 'people', null,
   '3대째 메밀을 미는 집', 'Three generations of buckwheat noodles',
   '솔밭 막국수 가족이 메밀 반죽을 이어 온 이야기.', 'How the family behind Solbat Makguksu has kept making buckwheat dough.',
   'https://example.com/sample-story-buckwheat.jpg',
   '2026-11-03', '{family}',
   '[
     {"t":"text","ko":"할머니가 시작한 막국수집을 지금은 손자가 함께 꾸려요. 반죽은 아직도 매일 아침 손으로 해요.","en":"The noodle shop the grandmother started is now run together with her grandson. The dough is still made by hand every morning."},
     {"t":"photo","url":"https://example.com/sample-story-dough.jpg","caption_ko":"아침마다 메밀 반죽","caption_en":"Buckwheat dough every morning"},
     {"t":"text","ko":"여름엔 물막국수, 겨울엔 따뜻한 수육을 많이 찾는대요.","en":"In summer people order cold noodles, in winter warm boiled pork."},
     {"t":"stop","place_id":"00000000-0000-4000-8000-000000000101","activity_id":null,"time_ko":null,"time_en":null,"note_ko":"수요일은 쉬어요","note_en":"Closed on Wednesdays"}
   ]'::jsonb,
   'published', '00000000-0000-4000-8000-000000000004', '2026-11-05T18:00:00+09:00', null, true),
  ('00000000-0000-4000-8000-000000000503', 'sample-jukdo-surf-guide', 'guide', 'surf',
   '죽도해변 서핑 가이드', 'Jukdo Beach surf guide',
   '처음 서핑하는 사람을 위한 죽도해변 안내.', 'A guide to Jukdo Beach for first-time surfers.',
   null,
   null, '{solo}',
   '[
     {"t":"heading","ko":"파도 보는 법","en":"Reading the waves"},
     {"t":"text","ko":"해변에 도착하면 바로 들어가지 말고 10분쯤 파도가 오는 간격을 지켜봐요.","en":"When you arrive, do not paddle out right away. Watch the wave intervals for about 10 minutes."},
     {"t":"heading","ko":"초보 포인트","en":"Beginner spots"},
     {"t":"text","ko":"해변 가운데는 사람이 많아요. 강습은 서핑샵 앞 얕은 쪽에서 해요.","en":"The middle of the beach is crowded. Lessons are held in the shallow area in front of the surf shops."},
     {"t":"stop","place_id":"00000000-0000-4000-8000-000000000104","activity_id":null,"time_ko":null,"time_en":null,"note_ko":"초보 강습은 4~10월","note_en":"Beginner lessons run April to October"},
     {"t":"heading","ko":"샤워·주차","en":"Showers and parking"},
     {"t":"text","ko":"해변에 화장실과 샤워장이 있고 주차도 할 수 있어요.","en":"The beach has toilets, showers and parking."},
     {"t":"stop","place_id":"00000000-0000-4000-8000-000000000105","activity_id":null,"time_ko":null,"time_en":null,"note_ko":null,"note_en":null},
     {"t":"heading","ko":"겨울 서핑","en":"Winter surfing"},
     {"t":"text","ko":"겨울엔 파도가 좋지만 물이 차요. 5mm 웻슈트와 장갑·부츠를 챙겨요.","en":"Winter brings good waves but cold water. Bring a 5mm wetsuit, gloves and boots."}
   ]'::jsonb,
   'published', '00000000-0000-4000-8000-000000000004', '2026-11-10T12:00:00+09:00', '2026-11-10T12:00:00+09:00', true)
on conflict (id) do nothing;
