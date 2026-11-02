# 양양생활(YANGYANG LIFE) 뼈대 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 11/13(금)까지 모든 화면이 빈 데이터로 동작하는 「양양생활」 웹앱 뼈대를 yangyang.life에 올려, 11/14(토)부터 참가자 16명이 관리 화면·작업 카드로 채울 수 있게 한다.

**Architecture:** Next.js App Router 단일 앱. 공개 화면은 `/[lang]`(ko|en) 아래, 관리 화면은 `/admin`. 데이터는 Supabase(새 프로젝트) — 공개 읽기는 anon + RLS(공개용 뷰), 모든 쓰기는 서버 액션에서 service role로. 관리 화면 로그인은 참가자별 개인 코드(누가 입력·확인했는지 기록하기 위해). 콘텐츠 1건 = 국문 원본 + 영문 칸.

**Tech Stack:** Next.js 16.2.2 · React 19.2.4 · TypeScript 5 · Tailwind CSS 4 · @supabase/supabase-js 2 · Vitest · qrcode · @anthropic-ai/sdk(번역 초안, `claude-haiku-5-5`) · Vercel · GitHub(lomadmichael)

**Spec:** `C:\Users\hongk\Desktop\Lomad\사업관련\농촌마을활력화사업\Ai내일바꿈\4기 심화편\양양생활_세부플랜_v1.md` (§3 화면, §3-1 같이 만드는 구조, §4 만드는 방식)

## Global Constraints

- 프로젝트 위치: `C:\Users\hongk\Desktop\ClaudeCode\yangyang-life\` · 저장소 `lomadmichael/yangyang-life`(private) · 도메인 `yangyang.life`(Vercel lomadcoop 팀, 구매 완료)
- 버전은 lomad-homepage와 동일하게: `next 16.2.2`, `react 19.2.4`, `tailwindcss ^4`. **이 Next.js는 학습 데이터와 다름 — 코드 작성 전 `node_modules/next/dist/docs/` 해당 가이드 확인**
- 서비스 표기명: 국문 「양양생활」, 영문 「YANGYANG LIFE」
- 모든 공개 화면 하단: 「양양군농업기술센터 지원」 / "Supported by Yangyang Agricultural Technology Center"
- 한글 글꼴: Noto Sans KR
- 가게 상태 세 가지: `participating`(참여) / `listed`(일반·확인만) / `closed`(휴업). 사진·영어 메뉴판은 `participating`만
- 모든 가게·할 거리에 확인 방법·확인일·확인한 사람 표기: 「정리·확인: {이름} · {YYYY. M. D.}」
- 사용자 팁: 3종(`changed` 바뀌었어요 / `tip` 꿀팁 / `directions` 가는 법), 별점 없음, **바로 공개 + 신고·사후 숨김**, 로그인 없이 닉네임
- 할 거리 두 종류: `dated`(시작·끝 날짜) / `always`(요일·시간대)
- 시간 판정은 항상 `Asia/Seoul` 기준(서버가 UTC여도)
- 영어 메뉴판 QR 주소는 **바뀌지 않는 가게 코드** 기반: `https://yangyang.life/en/m/{code}` (slug가 바뀌어도 인쇄된 QR이 살아 있어야 함)
- 시드 데이터는 `is_sample = true`. 운영(Production)에서는 숨기고 미리보기·로컬에서만 보임(`YL_SHOW_SAMPLES=1`)
- `git add -A` 금지, 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 외부에 생기는 것(Supabase 프로젝트 생성, GitHub 저장소, Vercel 프로젝트·도메인 연결)은 실행 직전 형님 확인. Supabase는 `get_cost`로 비용 먼저 확인

## Review Focus

1. **자정 넘는 영업시간과 UTC 서버** — 「18:00~02:00」 가게를 새벽 1시(서울)에 열었을 때 "영업 중", 서버가 UTC여도 같은 답 → Task 3 `isOpenNow` 테스트
2. **영문 칸이 빈 가게를 EN 화면에서 볼 때** — 한글 원문이 그대로 나오고 "English coming soon" 표시, 빈 칸이나 `undefined`가 나오면 안 됨 → Task 1 `pickText` 테스트
3. **팁에 전화번호·링크** — 개인정보·광고가 바로 공개되면 안 됨, 저장 전 거절 → Task 5 `validateTip` 테스트
4. **휴업 가게** — 「영업 중」 필터에 안 뜨고 목록 맨 뒤에 「휴업」 표시 → Task 4 `filterPlaces` 테스트
5. **끝난 날짜형 행사·요일 안 맞는 상시형** — 오늘 화면에 남아 있으면 안 됨, 비 오는 날 필터는 `rainy_ok`만 → Task 3 `activitiesForDay` 테스트

---

## 파일 구조

```
yangyang-life/
  CLAUDE.md                       참가자 Ai가 따르는 규칙 (Task 8)
  .github/workflows/ci.yml        lint + vitest + build (Task 8)
  .github/pull_request_template.md
  supabase/migrations/0001_init.sql   스키마·RLS·뷰 (Task 2)
  supabase/seed.sql                   샘플 데이터 is_sample=true (Task 2)
  src/
    i18n/ko.ts, en.ts, index.ts   화면 문구 사전 · Lang · t() · pickText() (Task 1)
    proxy.ts 또는 middleware.ts   / → /ko|/en (Next 16 문서 확인 후 이름 결정) (Task 1)
    lib/
      supabase.ts                 anon / service 클라이언트 (Task 2)
      types.ts                    Place, MenuItem, Activity, Contributor, Tip (Task 2)
      queries.ts                  공개 읽기 함수 (Task 2)
      hours.ts                    isOpenNow, seoulNow (Task 3)
      today.ts                    activitiesForDay (Task 3)
      places-filter.ts            filterPlaces (Task 4)
      tips.ts                     validateTip, canPost (Task 5)
      session.ts                  관리 화면 세션 토큰 (Task 6)
      permissions.ts              can(role, action) (Task 6)
      translate.ts                draftEnglish (Task 6)
      menu-url.ts                 menuUrl(code, lang) (Task 7)
    components/                   공통 부품 (Task 4)
    app/[lang]/...                공개 화면 (Task 4·5)
    app/admin/...                 관리 화면 (Task 6·7)
    app/print/menu/[code]/page.tsx  인쇄용 메뉴판 (Task 7)
  tests/*.test.ts                 Vitest
```

---

### Task 1: 앱 골격 · 두 언어 라우팅 · 문구 사전

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `src/app/globals.css`, `src/app/[lang]/layout.tsx`, `src/app/[lang]/page.tsx`(임시), `src/components/SiteFooter.tsx`, `src/components/LangSwitch.tsx`
- Create: `src/i18n/ko.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`, `src/proxy.ts`(또는 Next 16 문서상 이름)
- Test: `tests/i18n.test.ts`

**Interfaces:**
- Produces: `type Lang = "ko" | "en"` · `isLang(v: string): v is Lang` · `resolveLang(acceptLanguage: string | null): Lang`(ko 포함 → ko, 그 외 en) · `t(lang: Lang, key: keyof Dict): string` · `pickText(row: Record<string, unknown>, base: string, lang: Lang): { text: string; fallback: boolean }` — `row[\`${base}_${lang}\`]`가 비면 `row[\`${base}_ko\`]`를 주고 `fallback: true`

- [ ] **Step 1: 앱 생성** — `npx create-next-app@16.2.2 yangyang-life --ts --tailwind --app --src-dir --eslint --no-import-alias`, react 19.2.4 고정, `git init`, `npm i -D vitest`, `package.json` scripts에 `"test": "vitest run"`
- [ ] **Step 2: 실패하는 테스트 작성** `tests/i18n.test.ts`

```ts
expect(resolveLang("ko-KR,ko;q=0.9,en;q=0.8")).toBe("ko");
expect(resolveLang("en-US,en;q=0.9")).toBe("en");
expect(resolveLang(null)).toBe("en");
expect(pickText({ name_ko: "죽도식당", name_en: "Jukdo Diner" }, "name", "en")).toEqual({ text: "Jukdo Diner", fallback: false });
expect(pickText({ name_ko: "죽도식당", name_en: "" }, "name", "en")).toEqual({ text: "죽도식당", fallback: true });
expect(pickText({ name_ko: "죽도식당", name_en: null }, "name", "en")).toEqual({ text: "죽도식당", fallback: true });
expect(pickText({ name_ko: "죽도식당" }, "name", "ko")).toEqual({ text: "죽도식당", fallback: false });
```

- [ ] **Step 3: `npx vitest run tests/i18n.test.ts` → FAIL**
- [ ] **Step 4: `src/i18n/index.ts` 구현** — 사전 키는 홈 두 버튼(「오늘 뭐하지?」/"What to do today?", 「오늘 뭐 먹지?」/"Where to eat tonight?"), 푸터 지원 표기, "English coming soon" 등 화면 문구 전부. 라우팅: `/` 접근 시 `resolveLang(Accept-Language)`로 `/ko` 또는 `/en` 리다이렉트, `[lang]`이 `isLang` 아니면 404
- [ ] **Step 5: `npx vitest run` PASS · `npx next build` 성공**
- [ ] **Step 6: 커밋** `git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts src tests && git commit -m "feat: 앱 골격과 국·영 라우팅"`

---

### Task 2: Supabase 스키마 · RLS · 샘플 데이터 · 공개 읽기 함수

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/seed.sql`, `src/lib/supabase.ts`, `src/lib/types.ts`, `src/lib/queries.ts`, `.env.example`
- Test: `tests/queries.test.ts`

**Interfaces:**
- Produces (types.ts):
  - `Place { id; code; slug; category: "food"|"cafe"|"bar"|"surf"|"shop"; status: "participating"|"listed"|"closed"; name_ko; name_en; name_roman; summary_ko; summary_en; address_ko; lat; lng; hours: WeeklyHours; price_level: 1|2|3; parking: boolean|null; foreign_card: boolean|null; how_to_get_ko; how_to_get_en; photos: string[]; verified_method: "visit"|"phone"|"interview"|"public"; verified_at: string|null; verified_by_name: string|null; created_by_name: string|null; has_english_menu: boolean; is_sample }`
  - `WeeklyHours = Partial<Record<"mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun", [string, string][]>>` (예: `{ fri: [["18:00","02:00"]] }`)
  - `MenuItem { id; place_id; sort; name_ko; name_roman; name_en; desc_en; price: number|null; allergens: string[]; vegan: boolean; spicy: 0|1|2|3 }`
  - `Activity { id; kind: "dated"|"always"; title_ko; title_en; desc_ko; desc_en; place_id: string|null; location_ko; location_en; starts_on: string|null; ends_on: string|null; weekdays: number[]; time_note_ko; time_note_en; rainy_ok: boolean; link: string|null; verified_*; created_by_name; is_sample }` (weekdays: 0=일 ~ 6=토)
  - `Contributor { id; display_name; team; role_label; cohort; show: boolean }`
  - `PublicTip { id; target_type: "place"|"activity"; target_id; kind: "changed"|"tip"|"directions"; body; nickname; lang: Lang; created_at; handled: boolean }`
- Produces (queries.ts): `listPlaces(): Promise<Place[]>` · `getPlaceBySlug(slug): Promise<Place|null>` · `getPlaceByCode(code): Promise<Place|null>` · `listMenu(placeId): Promise<MenuItem[]>` · `listActivities(): Promise<Activity[]>` · `listContributors(): Promise<Contributor[]>` · `listTips(targetType, targetId): Promise<PublicTip[]>` · 모두 `YL_SHOW_SAMPLES !== "1"`이면 `is_sample=false`만
- Produces (supabase.ts): `anonClient()`, `serviceClient()`(server-only)

- [ ] **Step 1: 비용 확인 후 Supabase 새 프로젝트 생성** — `get_cost`(organization, project) 결과를 형님께 보이고 확인받은 뒤 `create_project`(이름 `yangyang-life`, 리전 ap-northeast-2). 키를 `.env.local`에(커밋 금지), 이름만 `.env.example`에
- [ ] **Step 2: `0001_init.sql` 작성** — 테이블 `contributors`(+`access_code_hash`, `role`: owner|member), `places`(+`code` text unique not null, 6자 소문자·숫자, 생성 후 변경 금지 트리거), `menu_items`, `activities`, `tips`(+`contact` text null, `device_id` text, `hidden` bool default false, `report_count` int default 0, `handled_at`), `tip_reports`(tip_id, device_id, unique 쌍). 공개 뷰: `places_public`(확인자·등록자 이름 조인, `has_english_menu` = 메뉴 존재), `contributors_public`(show=true만, 코드·역할 제외), `tips_public`(hidden=false, contact·device_id 제외). RLS: 모든 테이블 enable, anon은 공개 뷰 select만, 쓰기 정책 없음(쓰기는 service role)
- [ ] **Step 3: `seed.sql`** — 샘플(모두 `is_sample=true`): 가게 4곳(참여 2·일반 1·휴업 1, 그중 1곳은 18:00~02:00), 참여 가게 메뉴 6개(영문 1개는 일부러 빈칸), 할 거리 5건(진행 중 dated 1·끝난 dated 1·always 평일 1·always 주말 1·rainy_ok 1), 기여자 2명(owner 형님, member 샘플). 적용: `apply_migration` + `execute_sql`
- [ ] **Step 4: 실패하는 테스트** `tests/queries.test.ts` — 실제 DB 대상(환경변수 없으면 skip)

```ts
const places = await listPlaces();               // YL_SHOW_SAMPLES=1
expect(places.length).toBeGreaterThanOrEqual(4);
expect(places.find(p => p.status === "participating")?.has_english_menu).toBe(true);
const tips = await listTips("place", places[0].id);
expect(tips.every(t => !("contact" in t) && !("device_id" in t))).toBe(true);
// anon으로 tips 원본 테이블 select → 0행 또는 권한 오류
```

- [ ] **Step 5: `queries.ts` 구현 → `YL_SHOW_SAMPLES=1 npx vitest run tests/queries.test.ts` PASS** · `YL_SHOW_SAMPLES` 없이 `listPlaces()`가 0건인지도 확인
- [ ] **Step 6: 커밋** `git add supabase src/lib .env.example tests/queries.test.ts && git commit -m "feat: 데이터베이스 스키마와 공개 읽기"`

---

### Task 3: 영업 중 판정 · 오늘 할 거리 고르기

**Files:**
- Create: `src/lib/hours.ts`, `src/lib/today.ts`
- Test: `tests/hours.test.ts`, `tests/today.test.ts`

**Interfaces:**
- Consumes: `WeeklyHours`, `Activity`, `Place["status"]` (Task 2)
- Produces: `seoulParts(now: Date): { ymd: string; weekday: number; minutes: number }`(Asia/Seoul, weekday 0=일) · `isOpenNow(hours: WeeklyHours, status: Place["status"], now: Date): boolean` · `activitiesForDay(list: Activity[], now: Date, opts?: { rainy?: boolean }): Activity[]` — 순서: 오늘 해당 dated(끝나는 날 가까운 순) → always

- [ ] **Step 1: 실패하는 테스트**

```ts
// tests/hours.test.ts  — 2026-11-14(토)
const late = { fri: [["18:00","02:00"]], sat: [["18:00","02:00"]] } as WeeklyHours;
expect(isOpenNow(late, "listed", new Date("2026-11-14T16:30:00Z"))).toBe(true);  // 서울 11/15(일) 01:30 → 토요일 영업의 연장
expect(isOpenNow(late, "listed", new Date("2026-11-14T03:00:00Z"))).toBe(false); // 서울 토 12:00
expect(isOpenNow({ sat: [["11:00","21:00"]] }, "closed", new Date("2026-11-14T03:00:00Z"))).toBe(false); // 휴업
expect(isOpenNow({}, "listed", new Date("2026-11-14T03:00:00Z"))).toBe(false);
expect(seoulParts(new Date("2026-11-14T15:30:00Z"))).toMatchObject({ ymd: "2026-11-15", weekday: 0 });

// tests/today.test.ts — 기준 서울 2026-11-14(토) 10:00 = 2026-11-14T01:00:00Z
// 시드와 같은 5건으로: 진행 중 dated 포함, 끝난 dated 제외, 평일 always 제외, 주말 always 포함
expect(ids(activitiesForDay(list, now))).toEqual(["dated-on", "always-weekend", "always-rain"]);
expect(ids(activitiesForDay(list, now, { rainy: true }))).toEqual(["always-rain"]);
```

- [ ] **Step 2: `npx vitest run tests/hours.test.ts tests/today.test.ts` → FAIL**
- [ ] **Step 3: 구현** — 서울 시각은 `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", ... })`로 구함(서버 TZ에 의존 금지). 끝 시각 ≤ 시작 시각이면 다음 날 새벽까지로 보고, 전날 요일의 구간도 함께 검사
- [ ] **Step 4: `TZ=UTC npx vitest run` PASS**
- [ ] **Step 5: 커밋** `git add src/lib/hours.ts src/lib/today.ts tests && git commit -m "feat: 영업 중 판정과 오늘 할 거리"`

---

### Task 4: 공통 부품 · 공개 화면

**Files:**
- Create: `src/components/{PlaceCard,ActivityCard,FilterChips,VerifiedLine,MapLinks,FallbackNote,EmptyState}.tsx`, `src/lib/places-filter.ts`
- Create: `src/app/[lang]/page.tsx`(홈), `src/app/[lang]/eat/page.tsx`, `src/app/[lang]/do/page.tsx`, `src/app/[lang]/place/[slug]/page.tsx`, `src/app/[lang]/activity/[id]/page.tsx`, `src/app/[lang]/m/[code]/page.tsx`(영어 메뉴판), `src/app/[lang]/makers/page.tsx`
- Test: `tests/places-filter.test.ts`

**Interfaces:**
- Consumes: Task 1 `t`, `pickText` · Task 2 queries · Task 3 `isOpenNow`, `activitiesForDay`
- Produces: `filterPlaces(places: Place[], f: { category?: Place["category"]; openNow?: boolean; englishMenu?: boolean; price?: 1|2|3 }, now: Date): Place[]` — 정렬: 참여 → 일반 → 휴업, 같은 상태 안에서는 영업 중 먼저 · 부품 props: `VerifiedLine({ method, at, by, lang })` → 「정리·확인: {by} · {YYYY. M. D.}」/"Checked by {by} · {Mon D, YYYY}", `MapLinks({ lat, lng, name, lang })` → ko는 네이버지도, en은 Google Maps 링크

- [ ] **Step 1: 실패하는 테스트** `tests/places-filter.test.ts`

```ts
const r = filterPlaces(samples, { openNow: true }, satNoon);
expect(r.some(p => p.status === "closed")).toBe(false);
const all = filterPlaces(samples, {}, satNoon);
expect(all.at(-1)?.status).toBe("closed");
expect(all[0].status).toBe("participating");
expect(filterPlaces(samples, { englishMenu: true }, satNoon).every(p => p.has_english_menu)).toBe(true);
```

- [ ] **Step 2: FAIL 확인 → `places-filter.ts` 구현 → PASS**
- [ ] **Step 3: 화면 구현** (스펙 §3 표 그대로)
  - 홈: 큰 버튼 두 개(오늘 뭐하지 / 오늘 뭐 먹지), 언어 전환, 「만든 사람들」 링크
  - `/eat`: 필터 칩(종류·가격대·영업 중·영어 메뉴), 카드 목록, 휴업은 흐리게 「휴업」
  - `/do`: `activitiesForDay` 결과, 「비 오는 날」 토글, 날짜형이 없으면 상시형만으로 채워짐
  - 가게 상세: 사진(참여만), 주소·`MapLinks`, 영업시간·영업 중, 가격대, 주차, 외국 카드, 가는 법, `VerifiedLine`, 영어 메뉴 있으면 메뉴판 링크, 하단 팁 영역(Task 5가 채움)
  - `/m/[code]`: 한글명 + 로마자 + 영문명 + 설명 + 가격(₩) + 알레르기·비건·맵기 표시, 주문 팁 문구("Show this name to the staff"), EN이 기본이지만 KO도 동작
  - `/makers`: 팀별 기여자, 「여러분도 참여해주세요」 → 팁 안내
  - 영문 칸이 비면 한글 + `FallbackNote`("English coming soon"), 데이터가 0건이면 `EmptyState`
- [ ] **Step 4: 검증** — `YL_SHOW_SAMPLES=1 npm run dev`, 모바일 폭(375px)으로 7개 화면을 ko·en 각각 스크린샷(내장 브라우저), 콘솔 오류 0 · `npx next build` 성공
- [ ] **Step 5: 커밋** `git add src/components src/lib/places-filter.ts src/app tests/places-filter.test.ts && git commit -m "feat: 공개 화면과 공통 부품"`

---

### Task 5: 사용자 팁 (작성·목록·신고) + 「정보가 바뀌었나요?」

**Files:**
- Create: `src/lib/tips.ts`, `src/app/[lang]/tips/actions.ts`, `src/components/{TipList,TipForm,ReportButton}.tsx`
- Modify: 가게·할 거리 상세 페이지 하단(Task 4)
- Test: `tests/tips.test.ts`

**Interfaces:**
- Consumes: `PublicTip`, `serviceClient()`
- Produces: `validateTip(input: { kind; body; nickname; contact?: string }): { ok: true } | { ok: false; reason: "length"|"link"|"phone"|"kind"|"nickname" }` · `canPost(recent: Date[], now: Date): boolean`(같은 기기 60초 내 1건, 24시간 내 10건) · 서버 액션 `submitTip(formData): Promise<{ ok: boolean; message: string }>` · `reportTip(tipId: string): Promise<{ ok: boolean }>` · 기기 식별 쿠키 `yl_did`(없으면 발급, 1년)
- 규칙 [클로드 판단]: 같은 팁에 서로 다른 기기 신고 **3건이면 자동 숨김**, 숨김 해제는 관리 화면에서

- [ ] **Step 1: 실패하는 테스트**

```ts
expect(validateTip({ kind: "tip", body: "해 질 녘 2층 창가 자리가 좋아요", nickname: "서퍼" })).toEqual({ ok: true });
expect(validateTip({ kind: "tip", body: "a", nickname: "x" })).toEqual({ ok: false, reason: "length" });       // 본문 2~500자
expect(validateTip({ kind: "tip", body: "여기 보세요 https://ad.example", nickname: "x" })).toMatchObject({ reason: "link" });
expect(validateTip({ kind: "tip", body: "예약 www.abc.com", nickname: "x" })).toMatchObject({ reason: "link" });
expect(validateTip({ kind: "tip", body: "연락 010-1234-5678", nickname: "x" })).toMatchObject({ reason: "phone" });
expect(validateTip({ kind: "changed", body: "월요일 휴무로 바뀜", nickname: "사장", contact: "010-1234-5678" })).toEqual({ ok: true }); // contact 칸은 허용(비공개)
expect(validateTip({ kind: "review", body: "좋아요", nickname: "x" } as any)).toMatchObject({ reason: "kind" });
expect(canPost([new Date("2026-11-14T01:00:00Z")], new Date("2026-11-14T01:00:30Z"))).toBe(false);
expect(canPost([], new Date())).toBe(true);
```

- [ ] **Step 2: FAIL → 구현 → PASS**
- [ ] **Step 3: 화면 연결** — 상세 하단에 팁 목록(종류 배지·닉네임·날짜, 화면 언어와 다른 팁은 원문 그대로 + 언어 표시), 「팁 남기기」 폼(종류 3개 라디오), 「정보가 바뀌었나요?」 버튼은 같은 폼을 `changed`로 열고 연락처 칸(선택, 비공개 안내)을 보여줌. 신고 버튼은 기기당 1회
- [ ] **Step 4: 검증** — 로컬에서 팁 작성 → 즉시 목록 표시 / 30초 안에 재작성 거절 / 서로 다른 기기 쿠키 3개로 신고 → 목록에서 사라짐 / `tips_public`에 contact 없음. 시험 데이터는 끝나고 삭제
- [ ] **Step 5: 커밋** `git add src/lib/tips.ts src/app src/components tests/tips.test.ts && git commit -m "feat: 사용자 팁과 신고"`

---

### Task 6: 관리 화면 (개인 코드 로그인 · 국·영 입력 · 확인 기록 · 팁함 · 번역 초안)

**Files:**
- Create: `src/lib/session.ts`, `src/lib/permissions.ts`, `src/lib/translate.ts`
- Create: `src/app/admin/login/page.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`(대시보드: 확인 30일 지난 가게 수·새 「바뀌었어요」 팁 수), `src/app/admin/places/{page,new/page,[id]/page}.tsx`, `src/app/admin/places/[id]/menu/page.tsx`, `src/app/admin/activities/{page,new/page,[id]/page}.tsx`, `src/app/admin/tips/page.tsx`, `src/app/admin/contributors/page.tsx`, `src/app/admin/actions.ts`
- Test: `tests/session.test.ts`, `tests/permissions.test.ts`

**Interfaces:**
- Consumes: Task 2 타입·`serviceClient`
- Produces: `makeSession(contributorId: string): string` / `readSession(token?: string): { contributorId: string } | null`(HMAC-SHA256, 비밀키 `YL_SESSION_SECRET`, 유효 12시간 — lomad-homepage `src/app/ecology/admin/auth.ts` 방식) · 쿠키 `yl_admin`(path `/admin`) · `can(role: "owner"|"member", action: "edit_content"|"delete_content"|"hide_tip"|"manage_contributors"): boolean` · `draftEnglish(fields: Record<string, string>): Promise<Record<string, string>>`
- 개인 코드: 기여자마다 8자 코드를 owner가 발급(화면에 한 번만 표시), DB에는 해시만

- [ ] **Step 1: 실패하는 테스트**

```ts
const tok = makeSession("c1");
expect(readSession(tok)).toEqual({ contributorId: "c1" });
expect(readSession(tok.replace(/.$/, "0"))).toBeNull();        // 위조
expect(readSession(undefined)).toBeNull();
// 만료: vi.setSystemTime 으로 13시간 뒤 → null
expect(can("member", "edit_content")).toBe(true);
expect(can("member", "delete_content")).toBe(false);
expect(can("member", "hide_tip")).toBe(false);
expect(can("owner", "manage_contributors")).toBe(true);
```

- [ ] **Step 2: FAIL → `session.ts`·`permissions.ts` 구현 → PASS**
- [ ] **Step 3: 관리 화면 구현**
  - 입력 폼은 **국·영 칸을 나란히**, 영문 칸 옆 「Ai 번역 초안」 버튼(`draftEnglish`, 모델 `claude-haiku-5-5`, 키 `ANTHROPIC_API_KEY` 없으면 버튼 숨김). 초안은 칸에 채워질 뿐 저장은 사람이 누름
  - 저장 시 새 건은 `created_by` = 로그인한 사람. 「확인 완료」 버튼 = `verified_at` 오늘(서울)·`verified_by` 나·`verified_method` 선택
  - 영업시간 입력: 요일별 구간 여러 개, 「자정 넘김」 허용
  - 사진 업로드: Storage 버킷 `place-photos`(공개 읽기), 상태가 `participating`일 때만 업로드 칸 표시
  - 메뉴 편집: 행 추가·정렬·국/로마자/영문·가격·알레르기·비건·맵기
  - 팁함: 「바뀌었어요」 먼저, 연락처 보임(관리 화면에서만), 「처리 완료」(→ `handled_at`), owner만 숨김/해제
  - 기여자: owner만 추가·코드 발급·`show`·팀·역할 표기 수정
- [ ] **Step 4: 검증** — member 코드로 로그인해 가게 1곳 추가·확인 완료 → 공개 화면에 「정리·확인: 이름 · 날짜」 / member로 팁 숨김 시도 → 거절 / 로그아웃 후 `/admin/places` → 로그인으로. `npx next build` 성공
- [ ] **Step 5: 커밋** `git add src/lib/session.ts src/lib/permissions.ts src/lib/translate.ts src/app/admin tests && git commit -m "feat: 관리 화면"`

---

### Task 7: 영어 메뉴판 QR · 인쇄용 메뉴판

**Files:**
- Create: `src/lib/menu-url.ts`, `src/app/admin/places/[id]/qr/route.ts`, `src/app/print/menu/[code]/page.tsx`
- Modify: `src/app/admin/places/[id]/page.tsx`(QR·인쇄 버튼)
- Test: `tests/menu-url.test.ts`

**Interfaces:**
- Produces: `menuUrl(code: string, lang?: Lang): string` → `https://yangyang.life/en/m/{code}`(기본 en) · QR 라우트 `GET /admin/places/[id]/qr?format=svg|png` → 파일 다운로드(`qrcode` 패키지, 오류 정정 M, 여백 2) · 인쇄 페이지: A4 세로, 가게명(국·영)·메뉴 전부·QR·「YANGYANG LIFE」 로고 자리·하단 지원 표기, `@media print`

- [ ] **Step 1: 실패하는 테스트**

```ts
expect(menuUrl("a1b2c3")).toBe("https://yangyang.life/en/m/a1b2c3");
expect(menuUrl("a1b2c3", "ko")).toBe("https://yangyang.life/ko/m/a1b2c3");
```

- [ ] **Step 2: FAIL → 구현 → PASS**
- [ ] **Step 3: 검증** — 샘플 참여 가게 QR PNG 내려받아 휴대폰 카메라로 찍으면 로컬이 아닌 운영 주소가 열리는지(배포 후 Task 8에서 재확인) / 인쇄 미리보기 A4 1장에 맞음(메뉴 20개 기준) / 가게 slug를 바꿔도 `/en/m/{code}`가 그대로 열림
- [ ] **Step 4: 커밋** `git add src/lib/menu-url.ts src/app tests/menu-url.test.ts && git commit -m "feat: 영어 메뉴판 QR과 인쇄"`

---

### Task 8: 협업 장치 · 배포 (11/13 완료 기준)

**Files:**
- Create: `CLAUDE.md`, `.github/workflows/ci.yml`, `.github/pull_request_template.md`, `README.md`(참가자용: 로컬 실행 3줄, 작업 흐름)

**Interfaces:**
- Consumes: 앞 Task 전부

- [ ] **Step 1: `CLAUDE.md`(참가자 Ai용 규칙)** — 담을 것: 서비스 한 줄 설명 / 화면·폴더 지도 / 공통 부품만 쓸 것(새 색·새 글꼴 금지, 색은 `globals.css` 토큰) / 문구는 `src/i18n`에 국·영 함께 추가 / 데이터는 코드에 넣지 말고 관리 화면으로 / 한 PR = 화면 하나·기능 하나 / `main` 직접 푸시 금지 / 테스트·빌드 통과 후 PR / 이 Next.js는 학습 데이터와 다름 → `node_modules/next/dist/docs/` 확인
- [ ] **Step 2: CI** — `ci.yml`: PR과 main 푸시에 `npm ci` → `npm run lint` → `npm test` → `npx next build`(DB 테스트는 키 없으면 skip)
- [ ] **Step 3: 저장소·배포 (형님 확인 후)** — `gh repo create lomadmichael/yangyang-life --private --source . --push` · `main` 보호(PR 필수, CI 통과 필수, 합치기는 형님 계정만) · Vercel 프로젝트 연결(lomadcoop), 환경변수 등록(`YL_SHOW_SAMPLES`는 Preview=1, Production 미설정), `yangyang.life` 연결 · PR마다 미리보기 주소 생성 확인
- [ ] **Step 4: 작업 보드** — GitHub Projects 「양양생활 심화편」 칸: 할 일 / 하는 중 / 검토 / 완료. 1주차 카드 등록:
  - 개발(3): 「오늘 뭐 먹지 지도 보기」 · 「가게 카드 사진 슬라이드」 · 「홈 화면 '지금 영업 중' 요약」 · 「홈 화면 추가(PWA) 안내」
  - 디자인(2): 「로고·파비콘」 · 「색·글꼴 토큰 확정」 · 「로비 QR 안내문 A4」
  - 현장조사(4): 「현남면 가게 목록 1차(공개 정보)」 · 「참여 가게 섭외 기록표」 · 「상시형 할 거리 10건」
  - 영어(3): 「영문 표기 기준표(가게명 로마자 규칙)」 · 「샘플 메뉴판 검수」
  - 마케팅(3): 「숙소 3곳 협조 요청 자료」 · 「출시 홍보 계획」
  - PM(1): 「주간 점검 회의 진행표」
- [ ] **Step 5: 11/13 최종 점검** — 운영 주소 `https://yangyang.life` ko·en 7개 화면 200 응답(`curl`) / 운영에 샘플 0건 / 미리보기에 샘플 보임 / 형님 owner 코드 로그인 / 참가자 코드 16개 + 멘토 4개 발급 준비 / QR이 운영 주소로 열림
- [ ] **Step 6: 커밋** `git add CLAUDE.md README.md .github && git commit -m "chore: 참가자 협업 규칙과 CI"`
