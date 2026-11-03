# 양양생활 v2 확장 (3축 · 하단 메뉴 · 이야기 · MY) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배포된 v1 뼈대(두 버튼 안내 앱)를 장소·놀거리·이야기 3축 + 하단 메뉴 5칸 + 컨트리뷰터 이야기(초안→검토→공개) + 로그인 없는 MY를 갖춘 지역 여행 안내 서비스로 넓힌다.

**Architecture:**
- DB는 새 마이그레이션 0003 하나로 넓힌다. 장소 분류 7종, 놀거리 분류·운영 계절, `editor` 역할, `stories` 테이블, 팁 대상 `story`를 더한다.
- 공개 읽기는 지금처럼 definer 뷰(`*_public`)만 쓴다. 쓰기는 서버 액션 + `authorize()` + `can()`.
- 이야기 본문은 `stories.blocks` jsonb 배열 하나에 둔다. "들른 곳"은 장소·놀거리 **id만** 저장하고, 화면에서는 항상 현재 장소 값을 그린다. 역조회(이 장소가 나오는 이야기)는 jsonb 포함 검색(`@>`, GIN 인덱스)으로 한다. 별도 연결 테이블은 두지 않는다(같은 사실을 두 곳에 두지 않음).
- MY 저장은 이 기기의 localStorage. 저장된 id로 항목을 불러올 때는 서버 액션이 공개 뷰에서 읽는다.

**Tech Stack:** Next.js 16.2.2(App Router, `proxy.ts`, Promise params) · React 19.2.4 · Tailwind 4 토큰 · Supabase(PostgREST) · Vitest · 새 의존성 없음(아이콘은 SVG 직접)

**Spec:**
- `C:\Users\hongk\Desktop\Lomad\사업관련\농촌마을활력화사업\Ai내일바꿈\4기 심화편\양양생활_세부플랜_v2.md` (§3·§3-2·§3-3·§4 변경점 A~H, §10-5 결정)
- 화면 기능·규칙: `C:\Users\hongk\Desktop\ClaudeCode\yangyang-design\prd-yangyang-v2.md` (F0~F35, R1~R21)
- 화면 모양: `C:\Users\hongk\Desktop\ClaudeCode\yangyang-design\HANDOFF.md` + `out/` 화면들(디자인 하네스 결과 — UI 작업 전에 읽는다)

## Global Constraints

- 저장소 규칙 `CLAUDE.md` 전부 적용: 색은 `globals.css` 토큰 Tailwind 클래스만(임의 hex·`bg-[...]`·인라인 color 금지), 글꼴 Noto Sans KR 하나, 문구는 `src/i18n/ko.ts`·`en.ts`에 같이, 콘텐츠 데이터를 코드에 넣지 않음
- 공개 읽기는 `*_public` 뷰 + `anonClient()`만. 쓰기는 서버 액션에서 `authorize(action)` 후 `serviceClient()`
- `src/lib/supabase.ts`·`session.ts`·`access-code.ts`는 `"use client"` 파일에서 import 금지
- 시간 판정은 `src/lib/hours.ts`의 `seoulParts()`(Asia/Seoul)만
- 메뉴 QR 주소 `/{lang}/m/{code}`와 `code` 불변 규칙 유지
- 이미 적용된 `0001`·`0002` 마이그레이션 수정 금지. 새 파일 `supabase/migrations/0003_v2_axes.sql`. **운영 DB 적용은 형님 확인 후 메인 세션이 한다**(서브에이전트는 SQL을 실행하지 않음)
- **`next dev` 금지**(이 PC 메모리 부족으로 꺼짐). 화면 확인은 `npx next build && npx next start -p 3100` + curl/헤드리스
- `git add -A` 금지(파일을 지정해서 add). 브랜치 `feat/v2-axes`, main 직접 푸시 금지
- 새 npm 패키지 금지
- 375px 기준, 누르는 것 44px 이상, 공개 단 최대 `max-w-md`
- 분류 값(코드 키 ↔ 화면 이름, 순서 고정):
  - 장소 `food 식당/Restaurants · cafe 카페/Cafés · stay 숙소/Stay · surf 서핑샵/Surf shops · bar 펍·바/Pubs & bars · spot 해변·명소/Beaches & sights · life 생활 편의/Essentials`
  - 놀거리 `surf 서핑·SUP/Surf & SUP · festival 축제·행사/Festivals & events · eco 생태·자연/Nature & eco · hike 등산/Hiking · fishing 낚시/Fishing · walk 산책 코스/Walks · yoga 요가·웰니스/Yoga & wellness · village 마을·농촌 체험/Village experiences`
  - 이야기 갈래 `course 코스/Routes · people 사람/People · guide 가이드/Guides`
  - 추천 태그 `solo 혼자/Solo · couple 커플/Couples · family 가족/Family · nocar 차 없이/No car · rainy 비 오는 날/Rainy day`
  - 편의 `toilet 화장실/Toilets · shower 샤워장/Showers` (주차는 기존 `parking`)
- 재확인 기준: 장소·놀거리 **90일**, 가이드 **180일** (기존 관리 홈의 30일을 대체)
- 하단 메뉴: `홈 Home /{lang}` · `장소 Places /{lang}/places` · `놀거리 Play /{lang}/play` · `이야기 Stories /{lang}/stories` · `MY My /{lang}/my`. 영어 메뉴판(`/{lang}/m/…`)에는 그리지 않는다
- 필터는 주소 쿼리에: 장소 `?cat=…&open=1&en=1&price=2`(기존 키 유지), 놀거리 `?cat=…&rain=1`, 이야기 `?type=…&tag=…`

## Review Focus

1. **들른 곳 대상이 사라지거나 휴업한 경우** — 지워진 장소, 운영에서 숨겨지는 샘플 장소, `closed` 장소가 이야기에 연결돼 있으면, 이야기 화면은 깨지지 않아야 한다. 각각 「더 이상 안내하지 않는 곳이에요」 카드 또는 흐린 「지금은 휴업 중이에요」 카드로 보여야 한다 → Task 2 `resolveStops` 테스트
2. **localStorage가 없거나, 막혔거나, 망가진 JSON인 경우** — 사생활 보호 모드나 예전 형식이면 MY는 빈 목록으로 보이고, ★ 버튼은 눌러도 오류 없이 동작해야 한다 → Task 2 `saved.ts` 테스트
3. **해를 넘기는 운영 계절** — 운영 계절이 11·12·1·2·3월인 겨울 체험은 12월과 1월에 시즌 중이고 6월에 비시즌이어야 한다. 계절이 비어 있으면 사계절이다 → Task 2 `inSeason` 테스트
4. **권한 우회 시도** — member가 공개 액션을 직접 호출하거나 남의 이야기를 저장하면 거절돼야 한다. member가 이미 공개된 자기 글을 저장하면 다시 검토 대기로 돌아가야 한다(공개 글을 몰래 바꾸지 못함) → Task 1 권한 테스트 + Task 10 `nextStatusOnSave` 테스트
5. **옛 주소** — `/ko/eat?cat=food&open=1`은 308로 `/ko/places?cat=food&open=1`, `/en/do?rain=1`은 `/en/play?rain=1`로 쿼리를 보존한 채 넘어가야 한다. 옛 분류 키 `shop`이 주소에 오면 무시된다(오류 없이 전체) → Task 3 검증 단계 + Task 2 `parsePlacesQuery` 테스트

---

## 파일 지도

| 파일 | 책임 | 작업 |
|---|---|---|
| `supabase/migrations/0003_v2_axes.sql` | 스키마 확장 + 공개 뷰 갱신 | 1 |
| `supabase/seed_v2.sql` | 미리보기용 샘플(해변·생활 편의 장소, 놀거리 분류, 이야기 3편) | 1 |
| `src/lib/types.ts` | Place/Activity 확장, Story·StoryBlock·Role 타입 | 1 |
| `src/lib/labels.ts` | 분류·갈래·태그·편의 키 목록과 사전 키 | 1 |
| `src/lib/permissions.ts` | `editor` 역할, `publish_story` 액션 | 1 |
| `src/lib/play.ts` (신규) | `inSeason`, `groupPlay` | 2 |
| `src/lib/stale.ts` (신규) | 재확인 기준일 상수, `isStale` (admin/data.ts에서 옮김) | 2 |
| `src/lib/story-blocks.ts` (신규) | 블록 검증·`resolveStops`·`stopTargets`·`storyNeedsCheck` | 2 |
| `src/lib/saved.ts` (신규) | 기기 저장 상태 읽기·쓰기(순수 함수 + 안전한 storage 래퍼) | 2 |
| `src/lib/eat-query.ts` → `src/lib/list-query.ts` | 장소·놀거리·이야기 쿼리 파싱/직렬화 | 2 |
| `src/lib/places-filter.ts` | `visibleCategories` 추가 | 2 |
| `src/lib/queries.ts` | 이야기 조회, 역조회, id 묶음 조회, 팁 대상 story | 3 |
| `src/components/icons.tsx` (신규) | 아이콘 SVG 7개 | 3 |
| `src/components/BottomNav.tsx` (신규) | 하단 메뉴 | 3 |
| `src/app/[lang]/layout.tsx` · `next.config.ts` | 하단 메뉴 배치 · 옛 주소 308 | 3 |
| `src/app/[lang]/places`, `play` | `/eat`·`/do`를 옮겨 넓힘 | 4·5 |
| `src/components/SaveButton.tsx` · `CategoryTabs.tsx` (신규) | ★ 저장 · 분류 탭 | 4 |
| `src/app/[lang]/stories`, `stories/[slug]` · `src/components/StoryCard.tsx`, `StopCard.tsx` | 이야기 목록·상세 | 6 |
| `src/app/[lang]/page.tsx` | 홈 재구성 | 7 |
| `src/app/[lang]/my` | MY + 서버 액션 `loadSaved`, `listMyTips` | 8 |
| `src/app/admin/stories/**` · `admin/_components/StoryEditor.tsx` · `admin/review` | 이야기 쓰기·검토 | 10 |
| `src/app/admin/stale` · 장소/할 거리 폼 · 기여자 | 재확인 목록, 새 칸, 편집 역할 | 9 |
| `src/app/[lang]/makers` · `CLAUDE.md` · `AGENTS.md` | 기여자별 이야기 수 · 화면 지도 갱신 | 11 |

---

### Task 1: DB 0003 + 타입·분류·권한

**Files:**
- Create: `supabase/migrations/0003_v2_axes.sql`, `supabase/seed_v2.sql`
- Modify: `src/lib/types.ts`, `src/lib/labels.ts`, `src/lib/permissions.ts`, `src/lib/admin-input.ts`(CATEGORY_KO 7종), `src/i18n/ko.ts`·`en.ts`(분류·갈래·태그·편의 이름), `supabase/README.md`(0003 설명 한 단락)
- Test: `tests/permissions.test.ts`, `tests/i18n.test.ts`, 새 `tests/labels.test.ts`

**Interfaces:**
- Produces:
  - `Place["category"] = "food"|"cafe"|"stay"|"surf"|"bar"|"spot"|"life"`, `Place.amenities: ("toilet"|"shower")[]`
  - `Activity.category: PlayCategory`, `Activity.season_months: number[]` (1~12, 빈 배열 = 사계절)
  - `type PlayCategory = "surf"|"festival"|"eco"|"hike"|"fishing"|"walk"|"yoga"|"village"`
  - `type StoryType = "course"|"people"|"guide"`, `type StoryTag = "solo"|"couple"|"family"|"nocar"|"rainy"`, `type StoryStatus = "draft"|"review"|"returned"|"published"`
  - `type StoryBlock = {t:"text"; ko:string; en:string|null} | {t:"heading"; ko:string; en:string|null} | {t:"photo"; url:string; caption_ko:string|null; caption_en:string|null} | {t:"stop"; place_id:string|null; activity_id:string|null; time_ko:string|null; time_en:string|null; note_ko:string|null; note_en:string|null}` (stop은 place_id·activity_id 중 정확히 하나)
  - `interface Story { id; slug; type: StoryType; guide_topic: string|null; title_ko; title_en|null; summary_ko|null; summary_en|null; cover_photo|null; visited_on|null; tags: StoryTag[]; blocks: StoryBlock[]; author_id|null; author_name|null; author_team|null; published_at: string; verified_at|null; is_sample }`
  - `Role = "owner"|"editor"|"member"`, `AdminAction`에 `"publish_story"` 추가
  - labels: `CATEGORIES`(장소 7, Global Constraints 순서), `PLAY_CATEGORIES`, `PLAY_CATEGORY_KEY`, `STORY_TYPES`, `STORY_TYPE_KEY`, `STORY_TAGS`, `STORY_TAG_KEY`, `AMENITIES`, `AMENITY_KEY`

0003 내용(한 트랜잭션):
- `places.category`: 기존 check 삭제 → `update places set category='life' where category='shop'` → 7종 check
- `places.amenities text[] not null default '{}'` + check `<@ array['toilet','shower']`
- `activities.category text`: 추가 → 채우기(`kind='dated'`→`festival`, 나머지 `village`, `title_ko like '%요가%'`→`yoga`) → `not null` + 8종 check
- `activities.season_months smallint[] not null default '{}'` + check `<@ array[1..12]`
- `contributors.role` check에 `editor`
- `stories` 테이블: Story 칸 + `status`(4종, 기본 `draft`), `review_note text`, `author_id uuid references contributors on delete set null`, `published_at timestamptz`, `verified_at timestamptz`, `created_at`, `updated_at`(트리거 `set_updated_at`)
  - check: `slug` 정규식은 places와 같게 · `type='guide'` ↔ `guide_topic is not null` · `jsonb_typeof(blocks)='array'` · `tags` 5종 부분집합
  - GIN 인덱스 `stories_blocks_gin on stories using gin (blocks jsonb_path_ops)`
  - RLS 켜기, anon·authenticated `revoke all`
- `tips.target_type` check에 `story`
- 뷰
  - `places_public`·`activities_public`: `create or replace`, 새 칸은 **맨 끝에** 붙인다
  - `stories_public` 신설: `status='published'`만, 작성자 `display_name as author_name`, `team as author_team`. `review_note`·`status`는 뺀다. owner postgres, anon·authenticated select만
  - `tips_public`: 다시 만들 때 `is_sample` 판정에 stories 조인을 더한다(0002와 같은 owner·grant 문 반복)

seed_v2.sql(샘플만, `is_sample=true`, PRD v2 §6의 이름 그대로):
- 장소: 죽도해변(spot, toilet·shower, parking true), 현남 하나로마트(life)
- 활동 분류 갱신: 바다유리 공방 village · 가을 장터 festival · 해변 요가 yoga
- 「초보 서핑 강습」: surf, always, `season_months` 4~10, 바람길 서핑하우스 연결
- 이야기 3편, 모두 published: 「비 오는 날 차 없이 현남 하루」(course, 들른 곳 5개 — 바람길 서핑하우스 포함) · 「3대째 메밀을 미는 집」(people) · 「죽도해변 서핑 가이드」(guide, topic `surf`, heading 4개)
- 샘플 기여자 한유나·박하늘(editor)

- [ ] **Step 1: 실패하는 테스트**

```ts
// tests/permissions.test.ts 추가
it("editor 는 콘텐츠 수정·이야기 공개만", () => {
  expect(can("editor", "edit_content")).toBe(true);
  expect(can("editor", "publish_story")).toBe(true);
  expect(can("editor", "hide_tip")).toBe(false);
  expect(can("editor", "delete_content")).toBe(false);
  expect(can("editor", "manage_contributors")).toBe(false);
  expect(can("member", "publish_story")).toBe(false);
  expect(can("owner", "publish_story")).toBe(true);
  expect(isRole("editor")).toBe(true);
});
// tests/labels.test.ts
it("분류 순서와 사전 키", () => {
  expect(CATEGORIES).toEqual(["food", "cafe", "stay", "surf", "bar", "spot", "life"]);
  expect(PLAY_CATEGORIES).toEqual(["surf", "festival", "eco", "hike", "fishing", "walk", "yoga", "village"]);
  expect(STORY_TYPES).toEqual(["course", "people", "guide"]);
  expect(STORY_TAGS).toEqual(["solo", "couple", "family", "nocar", "rainy"]);
  for (const c of CATEGORIES) expect(t("ko", CATEGORY_KEY[c])).not.toBe(CATEGORY_KEY[c]);
  expect(t("en", PLAY_CATEGORY_KEY.village)).toBe("Village experiences");
  expect(t("ko", CATEGORY_KEY.life)).toBe("생활 편의");
});
```

- [ ] **Step 2:** `npm test` → 위 테스트 FAIL 확인
- [ ] **Step 3:** 타입·labels·permissions·사전·`CATEGORY_KO`를 Interfaces대로 바꾸고, 0003·seed_v2를 작성한다
- [ ] **Step 4:** `npm run lint && npm test && npx tsc --noEmit` 통과
  - `shop`·`catShop`을 쓰던 곳이 타입 오류로 드러나면 같은 작업 안에서 고친다
- [ ] **Step 5:** 0003을 SQL 문법만 검사한다
  - `npx supabase` 없이 확인: `node -e "require('fs').readFileSync('supabase/migrations/0003_v2_axes.sql','utf8')"` + 눈으로 확인
  - 실제 적용은 메인 세션이 한다
- [ ] **Step 6: 커밋** `git add supabase/migrations/0003_v2_axes.sql supabase/seed_v2.sql supabase/README.md src/lib/types.ts src/lib/labels.ts src/lib/permissions.ts src/lib/admin-input.ts src/i18n/ko.ts src/i18n/en.ts tests/permissions.test.ts tests/labels.test.ts` → `feat(db): 0003 — 장소 7분류·놀거리 분류·계절·이야기·편집 역할`

> **메인 세션 게이트:** Task 1 후 형님 확인을 받고 0003 → seed_v2를 운영 DB에 적용한다. 그다음 `get_advisors`로 확인하고, `select category, count(*) from places group by 1`로 실측한다. Task 3부터는 적용된 DB가 필요하다.

### Task 2: 순수 로직 (계절·분류 숨김·들른 곳·저장·쿼리 파싱·재확인)

**Files:**
- Create: `src/lib/play.ts`, `src/lib/stale.ts`, `src/lib/story-blocks.ts`, `src/lib/saved.ts`, `tests/play.test.ts`, `tests/stale.test.ts`, `tests/story-blocks.test.ts`, `tests/saved.test.ts`, `tests/list-query.test.ts`
- Rename: `src/lib/eat-query.ts` → `src/lib/list-query.ts`(`git mv`, 쓰는 곳 import 갱신)
- Modify: `src/lib/places-filter.ts`, `src/app/admin/data.ts`(`isStale` 정의를 지우고 `@/lib/stale` re-export)

**Interfaces:**
- Consumes: Task 1 타입·labels, `seoulParts(now)`, `activitiesForDay(list, now, {rainy})`
- Produces:
  - `inSeason(a: Pick<Activity,"season_months">, now: Date): boolean`
  - `groupPlay(list: Activity[], now: Date, f: {category?: PlayCategory; rainy?: boolean}): {dated: Activity[]; always: Activity[]; offSeason: Activity[]}` — `activitiesForDay` 결과를 분류로 거른 뒤, 비시즌을 `offSeason`으로 뺀다(dated도 계절 밖이면 offSeason)
  - `visibleCategories<K extends string>(order: readonly K[], items: {category: K}[]): K[]` — 항목 1개 이상인 키만, order 순서
  - `STALE_DAYS = 90`, `GUIDE_STALE_DAYS = 180`, `isStale(verifiedAt: string|null, now: Date, days = STALE_DAYS): boolean`
  - `parseStoryBlocks(raw: unknown): Parsed<StoryBlock[]>` — 최대 60블록. text·heading의 ko는 1~4000자. photo url은 `https://`. stop은 place_id·activity_id 중 정확히 하나가 uuid. 메모 각 200자
  - `stopTargets(blocks): {placeIds: string[]; activityIds: string[]}` (중복 제거)
  - `type ResolvedStop = {block: Extract<StoryBlock,{t:"stop"}>; n: number; state: "ok"|"closed"|"missing"; place: Place|null; activity: Activity|null}`
  - `resolveStops(blocks, places: Map<string,Place>, activities: Map<string,Activity>): ResolvedStop[]` — n은 1부터, stop 블록만 센다
  - `storyNeedsCheck(blocks, places: Map<string,Place>, activities: Map<string,Activity>): boolean` — resolveStops 중 `closed`/`missing`이 하나라도 있으면 true
  - `type SavedKind = "place"|"activity"|"story"`, `type SavedState = Record<SavedKind, string[]>`
  - `SAVED_KEY = "yl_saved_v1"`, `SAVED_MAX = 100` (종류별)
  - `parseSaved(raw: string|null): SavedState` (망가지면 빈 상태) · `toggleSaved(s, kind, id): SavedState` (새 항목은 앞에, 상한 넘으면 뒤에서 자름) · `isSaved(s, kind, id): boolean` · `readSaved(storage: Pick<Storage,"getItem">|null): SavedState` · `writeSaved(storage, s): boolean` — 예외를 삼키고 성공 여부만 돌려준다
  - `parsePlacesQuery(raw): PlaceFilter` / `placesQueryString(f)` — 기존 eat 함수 이름만 바꾼다. 키 `cat`·`open`·`en`·`price` 유지
  - `parsePlayQuery(raw): {category?: PlayCategory; rainy?: boolean}` / `playQueryString(f)` — 키 `cat`·`rain`
  - `parseStoriesQuery(raw): {type?: StoryType; tag?: StoryTag}` / `storiesQueryString(f)` — 키 `type`·`tag`

- [ ] **Step 1: 실패하는 테스트** (값은 그대로)

```ts
// play.test.ts — 2026-12-15T03:00:00Z 는 서울 12월, 2026-06-15T03:00:00Z 는 6월
it("해를 넘기는 계절", () => {
  const winter = { season_months: [11, 12, 1, 2, 3] };
  expect(inSeason(winter, new Date("2026-12-15T03:00:00Z"))).toBe(true);
  expect(inSeason(winter, new Date("2027-01-10T03:00:00Z"))).toBe(true);
  expect(inSeason(winter, new Date("2026-06-15T03:00:00Z"))).toBe(false);
  expect(inSeason({ season_months: [] }, new Date("2026-06-15T03:00:00Z"))).toBe(true);
});
it("서울 기준 월 경계: 2026-10-31T15:30:00Z 는 서울 11월 1일", () => {
  expect(inSeason({ season_months: [4, 5, 6, 7, 8, 9, 10] }, new Date("2026-10-31T15:30:00Z"))).toBe(false);
});
it("groupPlay: 비시즌 상시는 offSeason 으로, 분류·비 필터 적용", () => { /* 픽스처: surf always 4~10월, village always rainy_ok, festival dated 기간 안 → 2026-11-14 기준 dated=[festival], always=[village], offSeason=[surf]; {category:"surf"} → always=[], offSeason=[surf]; {rainy:true} → village 만 */ });

// stale.test.ts
it("90일·180일", () => {
  const now = new Date("2026-11-14T00:00:00Z");
  expect(isStale("2026-08-15T00:00:00Z", now)).toBe(true);   // 91일
  expect(isStale("2026-08-17T00:00:00Z", now)).toBe(false);  // 89일
  expect(isStale("2026-08-15T00:00:00Z", now, GUIDE_STALE_DAYS)).toBe(false);
  expect(isStale(null, now)).toBe(true);
});

// story-blocks.test.ts
it("stop 은 place_id/activity_id 중 정확히 하나", () => {
  expect(parseStoryBlocks([{ t: "stop", place_id: UUID, activity_id: UUID2 }]).ok).toBe(false);
  expect(parseStoryBlocks([{ t: "stop", place_id: null, activity_id: null }]).ok).toBe(false);
  expect(parseStoryBlocks([{ t: "photo", url: "http://x" }]).ok).toBe(false);
  expect(parseStoryBlocks(Array(61).fill({ t: "text", ko: "a" })).ok).toBe(false);
});
it("resolveStops: 휴업·사라짐·정상, 번호는 stop 만", () => {
  // blocks = [text, stop(열린 가게 A), photo, stop(closed 가게 B), stop(맵에 없는 id C)]
  const r = resolveStops(blocks, new Map([[A.id, A], [B.id, B]]), new Map());
  expect(r.map((s) => [s.n, s.state])).toEqual([[1, "ok"], [2, "closed"], [3, "missing"]]);
  expect(storyNeedsCheck(blocks, new Map([[A.id, A], [B.id, B]]), new Map())).toBe(true);
});

// saved.test.ts
it("망가진 저장값·막힌 storage", () => {
  expect(parseSaved("{oops")).toEqual({ place: [], activity: [], story: [] });
  expect(parseSaved('{"place":"x"}')).toEqual({ place: [], activity: [], story: [] });
  expect(readSaved(null)).toEqual({ place: [], activity: [], story: [] });
  const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  expect(readSaved(throwing)).toEqual({ place: [], activity: [], story: [] });
  expect(writeSaved(throwing, parseSaved(null))).toBe(false);
});
it("toggle: 넣기·빼기·상한", () => { /* toggle 두 번이면 원래대로; 101번째 넣으면 길이 100, 가장 오래된 것이 빠짐 */ });

// list-query.test.ts
it("옛 분류 키 shop 은 무시", () => {
  expect(parsePlacesQuery({ cat: "shop", open: "1" })).toEqual({ openNow: true });
  expect(parsePlayQuery({ cat: "village", rain: "1" })).toEqual({ category: "village", rainy: true });
  expect(storiesQueryString({ type: "course", tag: "nocar" })).toBe("?type=course&tag=nocar");
});
```

- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 구현한다
  - `inSeason`은 `seoulParts(now).ymd`의 월로 판정한다
  - `saved.ts`에는 `"use client"`를 붙이지 않는다(순수 모듈 — 클라이언트에서 import 가능)
- [ ] **Step 4:** `npm run lint && npm test && npx tsc --noEmit` 통과
- [ ] **Step 5: 커밋** (새 lib·tests·rename·data.ts·places-filter) `feat(lib): 계절·분류 숨김·들른 곳·기기 저장·목록 쿼리`

### Task 3: 공개 조회 + 하단 메뉴 + 옛 주소 이동

**Files:**
- Modify: `src/lib/queries.ts`, `src/lib/tips.ts`(대상 종류에 story), `src/app/[lang]/tips/actions.ts`(story 대상 허용), `src/app/[lang]/layout.tsx`, `next.config.ts`, `tests/queries.test.ts`, `tests/tips.test.ts`
- Create: `src/components/icons.tsx`, `src/components/BottomNav.tsx`
- Move: `src/app/[lang]/eat` → `places`, `src/app/[lang]/do` → `play`(`git mv`, 화면 내용은 Task 4·5에서 바꾼다. 내부 링크 `/eat`·`/do`는 전부 새 주소로)

**Interfaces:**
- Consumes: Task 1 타입, Task 2 `stopTargets`
- Produces (`queries.ts`, 전부 `sampleValues()` 필터 유지):
  - `listStories(f?: {type?: StoryType; tag?: StoryTag; authorId?: string}): Promise<Story[]>` — `published_at` 최신순. tag는 `.contains("tags",[tag])`
  - `getStoryBySlug(slug): Promise<Story|null>`
  - `listStoriesMentioning(kind: "place"|"activity", id: string): Promise<Story[]>` — `.contains("blocks", [{ place_id: id }])` 또는 `activity_id`
  - `getGuide(topic: string): Promise<Story|null>` — type=guide, 그 topic의 최신 1편
  - `listPlacesByIds(ids)`, `listActivitiesByIds(ids)`, `listStoriesByIds(ids)` — 각각 최대 100, 빈 배열이면 쿼리 없이 `[]`
  - `tipTargetExists("story", id)` → `stories_public` 확인
  - 아이콘(`icons.tsx`): `IconHome, IconPin, IconWave, IconBook, IconUser, IconStar, IconStarFilled` — `({className}: {className?: string}) => JSX`. 24×24 viewBox, `stroke="currentColor"`, 선 굵기 1.75, `aria-hidden`
  - `BottomNav({lang}: {lang: Lang})` — `"use client"`. `usePathname()`으로 현재 칸을 표시하고(현재 칸은 `text-sea`·`aria-current="page"`, 나머지는 `text-muted`), 경로에 `/m/`가 있으면 `null`. 화면 아래 고정. 아이폰 홈 바 여백은 globals.css에 `.safe-bottom { padding-bottom: env(safe-area-inset-bottom) }` 유틸 하나를 추가해 쓴다(임의 값 클래스 금지). 본문 아래 여백은 layout의 `main`에 준다
  - 상세 화면(장소·놀거리·이야기 상세)에서는 현재 칸을 부모 칸으로 본다: `/place/`→장소, `/activity/`→놀거리, `/stories/`→이야기, `/makers`→MY
- `next.config.ts` `redirects()`: `/:lang(ko|en)/eat` → `/:lang/places`, `/:lang(ko|en)/do` → `/:lang/play`, 둘 다 `permanent: true`(308, 쿼리는 Next가 보존)

- [ ] **Step 1: 실패하는 테스트**
  - `tests/queries.test.ts`(DB 있을 때만, 샘플 표시): `listStories()` ≥ 3, `listStories({type:"guide"})` = 1편이고 `guide_topic==="surf"`
  - `listStoriesMentioning("place", 바람길id)`에 「비 오는 날 차 없이 현남 하루」 포함
  - `getStoryBySlug` 결과에 `status`·`review_note` 키 없음
  - 샘플을 숨기면(`YL_SHOW_SAMPLES` 삭제) `listStories()` = `[]`
- [ ] **Step 2:** `npm test` → FAIL(DB 적용 전이면 Task 1 게이트 먼저)
- [ ] **Step 3:** 구현한다
- [ ] **Step 4:** `npm run lint && npm test && npx next build` 통과
- [ ] **Step 5:** `npx next start -p 3100`(백그라운드)로 확인
  - `curl -sI localhost:3100/ko/eat?cat=food\&open=1` → `308`, `location: /ko/places?cat=food&open=1`
  - `curl -sI localhost:3100/en/do?rain=1` → `/en/play?rain=1`
  - `curl -s localhost:3100/en/m/<샘플 code> | grep -c 'aria-current'` → 0
  - 확인 후 서버 종료
- [ ] **Step 6: 커밋** `feat: 하단 메뉴·이야기 조회·옛 주소 308`

### Task 4: 장소 목록·상세 + ★ 저장 버튼 + 분류 탭

**Files:**
- Create: `src/components/CategoryTabs.tsx`, `src/components/SaveButton.tsx`
- Modify: `src/app/[lang]/places/page.tsx`, `src/app/[lang]/place/[slug]/page.tsx`, `src/components/PlaceCard.tsx`, i18n

**Interfaces:**
- Consumes: `visibleCategories`, `parsePlacesQuery`/`placesQueryString`, `listStoriesMentioning`, `toggleSaved`/`readSaved`/`writeSaved`/`isSaved`
- Produces:
  - `CategoryTabs<K extends string>({items, current, hrefFor, labelFor}: {items: K[]; current?: K; hrefFor: (k?: K) => string; labelFor: (k: K) => string; allLabel: string})` — 가로 스크롤, 맨 앞 「전체」. 장소·놀거리·이야기가 함께 쓴다
  - `SaveButton({kind, id, lang, size?: "sm"|"md"})` — `"use client"`. 처음 그릴 때 `useSyncExternalStore`로 localStorage를 읽고, 서버 렌더에서는 비어 있는 별로 그린다. 누르면 토글하고 아래 작은 알림 「저장했어요 · MY에서 보기」(2초). 저장 실패(`writeSaved` false)면 「이 브라우저에선 저장할 수 없어요」
- 화면 규칙:
  - F3: 탭은 `visibleCategories(CATEGORIES, 전체 장소)`
  - spot·life 카드: 가격 기호·영어 메뉴 배지 대신 편의 배지(주차·화장실·샤워장)
  - F4·F5: 상세 머리에 ★. 아래에 「이 장소가 나오는 이야기」(있을 때만, StoryCard 작게 — StoryCard는 Task 6에서 만드니 이 작업에선 제목 링크 목록으로 두고 Task 6에서 바꾼다), 「여기서 할 수 있는 놀거리」(`place_id` 연결 활동)
  - 모양은 `yangyang-design/HANDOFF.md`와 out/ 장소 화면을 따른다

- [ ] **Step 1:** 모양을 정하는 테스트는 없다. 서버 렌더 결과를 검증 단계에서 확인한다
- [ ] **Step 2:** 구현한다 → `npm run lint && npm test && npx next build`
- [ ] **Step 3:** `next start`로 확인
  - `/ko/places` HTML에 분류 탭이 샘플 데이터에 있는 분류만 있는지(예: 숙소 탭 없음)
  - `/ko/places?cat=spot`에 죽도해변
  - `/en/place/<솔밭 slug>`에 이야기 제목 링크
  - 375px 헤드리스 스크린샷 ko·en 2장
- [ ] **Step 4: 커밋** `feat(places): 7분류 탭·빈 분류 숨김·★ 저장·상세 역조회`

### Task 5: 놀거리 목록·상세

**Files:** Modify `src/app/[lang]/play/page.tsx`, `src/app/[lang]/activity/[id]/page.tsx`, `src/components/ActivityCard.tsx`, i18n

**Interfaces:**
- Consumes: `groupPlay`, `parsePlayQuery`, `visibleCategories(PLAY_CATEGORIES, …)`, `getGuide(category)`, `CategoryTabs`, `SaveButton`
- 화면 규칙:
  - F6 묶음 순서는 기간 행사 → 언제든 → 「지금은 비시즌」(`<details>` 접힘, 카드 흐리게 `opacity-60`)
  - 분류를 고르고 그 분류의 가이드가 있으면 맨 위에 가이드 카드(→ `/stories/{slug}`)
  - 날짜 줄 「오늘 11월 14일 (토)」는 기존 포맷 함수를 쓴다
  - F7: 운영 계절 줄 「운영 4월~10월」 / "Season: Apr–Oct"(비면 줄 없음), ★

- [ ] **Step 1:** 구현한다 → lint·test·build
- [ ] **Step 2:** `next start` 확인
  - `/ko/play?cat=surf`에 가이드 카드 + 비시즌 묶음에 「초보 서핑 강습」(11월 기준)
  - `/en/play?rain=1`에 바다유리 공방만
  - 375px ko·en 스크린샷
- [ ] **Step 3: 커밋** `feat(play): 8분류·가이드 카드·비시즌 묶음`

### Task 6: 이야기 목록·상세(코스·사람·가이드) + 이야기 팁

**Files:**
- Create: `src/app/[lang]/stories/page.tsx`, `src/app/[lang]/stories/[slug]/page.tsx`, `src/components/StoryCard.tsx`, `src/components/StopCard.tsx`, `src/components/StoryBody.tsx`
- Modify: `src/components/TipForm.tsx`·`TipList.tsx`(target_type story), `src/app/[lang]/place/[slug]/page.tsx`(Task 4의 제목 링크 → StoryCard), i18n

**Interfaces:**
- Consumes: `listStories`, `getStoryBySlug`, `stopTargets`, `listPlacesByIds`, `listActivitiesByIds`, `resolveStops`, `isStale(..., GUIDE_STALE_DAYS)`, `isOpenNow`, `parseStoriesQuery`
- Produces:
  - `StoryCard({story, lang, size?: "lg"|"sm"})`
  - `StopCard({stop, lang, numbered: boolean})` — state별:
    - ok: 이름·분류·영업 배지(장소면 `isOpenNow`)
    - closed: `opacity-60` + 「지금은 휴업 중이에요」
    - missing: 링크 없는 회색 카드 「더 이상 안내하지 않는 곳이에요」
  - `StoryBody({blocks, resolved, lang, numbered})` — text·heading·photo·stop을 순서대로 그린다. 가이드는 `numbered=false`, 맨 위에 heading 목차(앵커 `#h-{index}`)
- 화면 규칙:
  - F27: 갈래 탭 + 태그 칩. 탭은 `visibleCategories(STORY_TYPES, …)` (key `type`)
  - F28: 「이 코스의 장소 모두 저장」은 ok·closed 장소만 저장한다
  - F29: 가이드가 180일 지나면 노란 띠 — 색은 `salmon-soft` 토큰을 쓴다(노랑 토큰 없음, 새 색 금지)
  - 영문 칸이 비면 R5(FallbackNote)
  - 이야기 상세에도 팁 목록·쓰기

- [ ] **Step 1: 실패하는 테스트** — `tests/tips.test.ts`: `validateTip({target_type:"story", …})` 통과, `target_type:"menu"` 거절
- [ ] **Step 2:** 구현한다 → lint·test·build
- [ ] **Step 3:** `next start` 확인
  - `/ko/stories/<코스 slug>`에 번호 1~5, 바람길 카드에 「지금은 휴업 중이에요」
  - `/en/stories/<가이드 slug>`에 목차 4개·번호 없음
  - `/ko/stories?type=guide`에 1편
  - 스크린샷 ko·en
- [ ] **Step 4: 커밋** `feat(stories): 목록·상세·들른 곳 실시간 상태·이야기 팁`

### Task 7: 홈 재구성

**Files:** Modify `src/app/[lang]/page.tsx`, i18n

**Interfaces:** Consumes `listPlaces`+`isOpenNow`, `listActivities`+`groupPlay`, `visibleCategories`, `listStories`, `CategoryTabs`는 쓰지 않음(홈 바로가기는 아이콘 격자)

- 화면 규칙(F2 ①~⑥):
  - 「비 오는 날」 토글은 `?rain=1`. 켜지면 열린 곳 중 실내 판정 없음 — 장소엔 실내 정보가 없으므로 **열린 곳 줄은 그대로 두고 놀거리만 거른다**(PRD F2의 "실내만"은 데이터가 없어 이번엔 하지 않음 — HANDOFF와 PR 설명에 기록)
  - 열린 곳은 최대 10개 가로 스크롤
  - 이번 주 놀거리는 오늘 기준 `groupPlay`의 dated+always에서 3개
  - 바로가기는 장소·놀거리 분류 중 항목이 있는 것만, 최대 8칸, 순서 = 장소 분류 → 놀거리 분류
  - 새 이야기 3편, 「만든 사람들」 띠
- [ ] **Step 1:** 구현한다 → lint·test·build
- [ ] **Step 2:** `next start` 확인
  - `/ko`에 열린 곳 줄·새 이야기 3편·바로가기에 숙소 없음
  - `/en?rain=1`에 놀거리 1개
  - 스크린샷 ko·en
- [ ] **Step 3: 커밋** `feat(home): 오늘 열린 곳·이번 주·바로가기·새 이야기`

### Task 8: MY (기기 저장·내 팁)

**Files:** Create `src/app/[lang]/my/page.tsx`, `src/app/[lang]/my/MyClient.tsx`, `src/app/[lang]/my/actions.ts`; Modify i18n

**Interfaces:**
- Consumes: `readSaved`, `listPlacesByIds`/`listActivitiesByIds`/`listStoriesByIds`, `PlaceCard`·`ActivityCard`·`StoryCard`, 기기 쿠키 `yl_did`(tips/actions.ts의 상수를 export해서 같이 쓴다 — 복제 금지)
- Produces (`actions.ts`, `"use server"`):
  - `loadSaved(s: SavedState): Promise<{places: Place[]; activities: Activity[]; stories: Story[]}>` — 입력의 id를 uuid로 검증하고 종류별 100개로 자른다. 결과는 저장 순서를 따른다(없어진 id는 조용히 빠짐)
  - `listMyTips(): Promise<{id; target_type; target_id; target_name: string|null; kind; body; created_at; handled: boolean}[]>`
    - `yl_did` 쿠키가 없으면 `[]`
    - `serviceClient()`로 `tips`에서 `device_id = 쿠키 && hidden=false`를 최신 50건. 대상 이름은 공개 뷰에서 찾는다
    - **반환에 device_id·contact를 넣지 않는다**
- 화면(F31): 저장 탭 3개(장소/놀거리/이야기), 빈 상태 「★를 누르면 여기 모여요」, 내 팁, 언어, 「컨트리뷰터로 참여하기」 상자(문의는 「만든 사람들」로 링크 — 연락처를 새로 쓰지 않음), 「만든 사람들」 링크, 「관리자 로그인」 작은 글씨(`/admin/login`), 안내 「저장 목록은 이 기기에만 남아요」

- [ ] **Step 1: 실패하는 테스트** — `tests/saved.test.ts`에 `sanitizeSavedInput(s)` 추가: uuid가 아닌 값 제거, 종류별 100 상한
  - 이 함수는 `saved.ts`에 둔다. `loadSaved`가 쓴다
- [ ] **Step 2:** 구현한다 → lint·test·build
- [ ] **Step 3:** `next start` + 헤드리스 확인
  - localStorage에 `yl_saved_v1`로 샘플 장소 2개를 넣고 `/ko/my` → 카드 2장
  - 값을 `"{oops"`로 바꾸면 빈 상태 문구
  - 스크린샷 ko·en
- [ ] **Step 4: 커밋** `feat(my): 기기 저장·내 팁·참여 안내`

### Task 9: 관리 — 장소·놀거리 새 칸, 편집 역할, 재확인 목록

**Files:**
- Modify: `src/app/admin/_components/PlaceForm.tsx`·`place-values.ts`·`ActivityForm.tsx`·`activity-values.ts`·`ContributorEditor.tsx`·`ui.tsx`(필요 시), `src/lib/admin-input.ts`(`parsePlaceInput`에 amenities, `parseActivityInput`에 category·season_months), `src/app/admin/actions.ts`(기여자 role editor 허용), `src/app/admin/page.tsx`(30일 → `STALE_DAYS`, 숫자 카드), `src/app/admin/layout.tsx`(이름 옆 「· 편집」)
- Create: `src/app/admin/stale/page.tsx`
- Test: `tests/admin-input.test.ts`

**Interfaces:**
- Consumes: `isStale`/`STALE_DAYS`/`GUIDE_STALE_DAYS`, `storyNeedsCheck`, labels
- 규칙:
  - 분류 spot·life면 가격대·영어 메뉴 관련 칸을 숨기고 편의 체크를 보인다(숨긴 칸은 저장 시 기본값 유지)
  - 놀거리 분류 필수, 운영 계절은 12개 월 토글(비우면 사계절)
  - F35 재확인 목록 = 장소·놀거리 90일(휴업 제외, 기록 없음 포함) + 가이드 180일 + `storyNeedsCheck` 공개 이야기. 편집·운영만 보임(member 접근 시 `/admin`으로)
- [ ] **Step 1: 실패하는 테스트**

```ts
it("놀거리 분류 필수·계절 1~12", () => {
  expect(parseActivityInput({ ...valid, category: undefined }).ok).toBe(false);
  expect(parseActivityInput({ ...valid, category: "village", season_months: [13] }).ok).toBe(false);
  const r = parseActivityInput({ ...valid, category: "surf", season_months: [10, 4, 4] });
  expect(r.ok && r.value.season_months).toEqual([4, 10]);
});
it("편의는 toilet/shower 만", () => {
  expect(parsePlaceInput({ ...validPlace, category: "spot", amenities: ["toilet", "wifi"] }).ok).toBe(false);
});
```

- [ ] **Step 2:** FAIL 확인 → 구현 → lint·test·build
- [ ] **Step 3: 커밋** `feat(admin): 7분류·편의·놀거리 분류·계절·편집 역할·재확인 목록`

### Task 10: 관리 — 이야기 쓰기·검토

**Files:**
- Create: `src/app/admin/stories/page.tsx`, `stories/new/page.tsx`, `stories/[id]/page.tsx`, `src/app/admin/review/page.tsx`, `src/app/admin/_components/StoryEditor.tsx`, `src/lib/story-status.ts`, `tests/story-status.test.ts`
- Modify: `src/app/admin/actions.ts`(이야기 액션), `src/app/admin/data.ts`(`listStoriesAdmin`, `getStoryAdmin`, 장소·놀거리 검색용 옵션), `src/lib/admin-input.ts`(`parseStoryInput`), `src/app/admin/layout.tsx`(탭 「이야기」, 편집 이상 「검토」), `src/app/admin/page.tsx`(검토 대기·돌려받은 내 이야기 카드)

**Interfaces:**
- Consumes: `parseStoryBlocks`, `authorize`, `can`, `translate` 초안(기존 `BilingualField`의 Ai 초안 버튼 재사용), 사진 업로드(기존 PhotoManager 업로드 경로 `place-photos` 버킷 재사용 — 경로 접두 `stories/{id}/`)
- Produces:
  - `story-status.ts`:
    - `nextStatusOnSave(current: StoryStatus, role: Role, isAuthor: boolean, intent: "save"|"submit"): StoryStatus | "forbidden"`
    - `canEditStory(role: Role, isAuthor: boolean): boolean`
  - actions(`"use server"`, 전부 `authorize` 먼저):
    - `saveStory(input) → ActionResult<{id}>` — `edit_content` + `canEditStory`. 상태는 `nextStatusOnSave`. member가 published 글을 저장하면 `review`로 내려간다
    - `publishStory(id)` — `publish_story`. status=published. `published_at`은 처음 공개할 때만 now
    - `returnStory(id, note)` — `publish_story`, 메모 1~500자 필수, status=returned
    - `unpublishStory(id)` — `publish_story`, status=draft
    - `verifyGuide(id)` — 가이드 마지막 확인(verified_at=now)
  - `parseStoryInput(raw): Parsed<StoryRow>` — 제목 1~80자, 요약 ≤140자, slug는 places와 같은 규칙(`suggestSlug` 재사용), type·guide_topic 관계, tags, visited_on, blocks(`parseStoryBlocks`)
- 상태표 (nextStatusOnSave):
  - `save`: draft→draft, returned→returned. review→review. published→(member면 review, editor/owner면 published)
  - `submit`: draft·returned→review
  - member·isAuthor=false → forbidden
- 화면(F32~F34):
  - 블록 추가 버튼은 아래쪽, 저장 버튼은 아래 고정
  - 들른 곳 블록은 장소·놀거리 검색(이름 부분 일치, 샘플 규칙 `sampleOptions` 재사용)
  - 미리보기는 공개 화면 `StoryBody`를 그대로 쓴다(복제 금지)
  - 돌려받은 글은 맨 위 메모 상자(`border-salmon`)

- [ ] **Step 1: 실패하는 테스트**

```ts
it("상태 전이", () => {
  expect(nextStatusOnSave("published", "member", true, "save")).toBe("review");
  expect(nextStatusOnSave("published", "editor", false, "save")).toBe("published");
  expect(nextStatusOnSave("draft", "member", false, "save")).toBe("forbidden");
  expect(nextStatusOnSave("returned", "member", true, "submit")).toBe("review");
  expect(nextStatusOnSave("draft", "member", true, "save")).toBe("draft");
});
it("가이드는 주제 필수", () => {
  expect(parseStoryInput({ ...validStory, type: "guide", guide_topic: null }).ok).toBe(false);
  expect(parseStoryInput({ ...validStory, type: "course", guide_topic: "surf" }).ok).toBe(false);
});
```

- [ ] **Step 2:** FAIL → 구현 → lint·test·build
- [ ] **Step 3:** `next start`로 확인
  - 관리 화면 흐름: 샘플 member 코드로 로그인 → 초안 → 검토 요청 → editor 로그인 → 공개 → 공개 화면에 보임
  - **테스트용 이야기는 `is_sample=true`로 만들고 끝나면 지운다**(이번에 만든 것만)
- [ ] **Step 4: 커밋** `feat(admin): 이야기 쓰기·검토·공개·돌려보내기`

### Task 11: 만든 사람들 이야기 수 + 문서 갱신

**Files:** Modify `src/app/[lang]/makers/page.tsx`, `src/lib/queries.ts`(필요 시 `listStories({authorId})` 사용), `CLAUDE.md`(화면 지도·부품 목록·하단 메뉴 규칙), `AGENTS.md`, `README.md`(화면 목록), i18n

- F12: 이름 옆 「이야기 n편」(0이면 생략), 누르면 `/stories?author={id}`
  - `parseStoriesQuery`에 `author`(uuid)를 추가하고 테스트 한 줄을 더한다
- CLAUDE.md 화면 지도:
  - `/eat`·`/do` → `/places`·`/play`
  - `/stories`·`/my`·`/admin/stories`·`/admin/review`·`/admin/stale` 추가
  - 부품 목록에 BottomNav·CategoryTabs·SaveButton·StoryCard·StopCard·StoryBody·icons
  - "이야기 본문에 가게 정보를 글로 베끼지 말고 들른 곳 블록으로 연결" 규칙 한 줄
- [ ] **Step 1:** 구현한다 → lint·test·build
- [ ] **Step 2: 커밋** `docs+feat: 만든 사람들 이야기 수·화면 지도 v2`

---

## 실행 순서와 게이트

1. Task 1 → **형님 확인 후 0003·seed_v2 운영 적용(메인)** → Task 2 → Task 3
2. 디자인 하네스 결과(`yangyang-design/HANDOFF.md`)가 나온 뒤 UI 작업 Task 4~8
3. Task 9·10(관리)은 Task 3 이후라면 디자인과 무관하게 진행 가능
4. 마지막에 브랜치 전체 리뷰 → PR → CI → 형님 승인 후 합치기 → Vercel 배포 → yangyang.life 실측(새 주소 11개·옛 주소 308·샘플 0)
5. 작업 보드: 「먹을 곳」「할 거리」 카드 문구를 `/places`·`/play` 기준으로 고친다(메인)
