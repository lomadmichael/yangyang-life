# 양양생활 (YANGYANG LIFE) — AI 작업 규칙

양양(현남면)을 찾은 외국인·내국인 방문객에게 장소·놀거리·이야기(컨트리뷰터가 쓰는 코스·사람·가이드)를 알려 주는 국·영 이중 언어 지역 여행 안내 웹앱 (Next.js 16 + Supabase). 하단 메뉴 5칸: 홈·장소·놀거리·이야기·MY.
이 저장소는 비개발자 참가자도 Claude Code로 PR을 올려 함께 만든다. **아래 규칙을 어기는 변경은 만들지 말고, 필요하면 사용자에게 먼저 물어라.**

## 화면 ↔ 폴더 지도
| 화면 | 위치 |
|---|---|
| 홈 `/[lang]` | `src/app/[lang]/page.tsx` (lang = ko / en) |
| 장소 `/[lang]/places` · 놀거리 `/[lang]/play` | `src/app/[lang]/places`, `play` |
| 이야기 `/[lang]/stories` · 상세 `/[lang]/stories/[slug]` | `src/app/[lang]/stories` |
| 내 저장·내 팁 `/[lang]/my` | `src/app/[lang]/my` |
| 가게 상세 `/[lang]/place/[slug]` · 놀거리 상세 `/[lang]/activity/[id]` | `src/app/[lang]/place`, `activity` |
| 만든 사람들 `/[lang]/makers` · 메뉴 QR 착지 `/[lang]/m/[code]` | `src/app/[lang]/makers`, `m` |
| 공개 화면 틀(글꼴·머리/하단 메뉴·푸터) · 지면 스타일 | `src/app/[lang]/layout.tsx` · `src/app/globals.css`(토큰) · `magazine.css` · `magazine-places.css` · `magazine-pages.css` |
| 팁 제보 서버 액션 | `src/app/[lang]/tips/actions.ts` |
| 관리 화면 `/admin/...` (로그인·가게·놀거리·팁함·기여자) · 이야기 `/admin/stories` · 검토 `/admin/review` · 오래된 정보 `/admin/stale` | `src/app/admin/` (폼 부품은 `admin/_components/`, 서버 액션은 `admin/actions.ts`) |
| 인쇄용 메뉴판 `/print/menu/[code]` | `src/app/print/` |
| 언어 분기(`/` → `/ko` 또는 `/en`) | `src/proxy.ts` |
| 공개 데이터 읽기 | `src/lib/queries.ts` · 타입 `types.ts` |
| 문구 | `src/i18n/ko.ts`, `en.ts` |
| DB 스키마 | `supabase/migrations/` · 일회성 스크립트 `scripts/` · 테스트 `tests/` |

## 디자인·부품 (v4 「바다 잡지」, 2026-11 개편)
- 디자인 명세: `yangyang-design/out/v3/d/`(결합안 D). 큰 명조 제목 · 넓은 여백 · 가는 선 · 번호 색인 · 작은 대문자 라벨 · 색면 카드 · 쪽빛 남색 뒤집힌 단락 · 입장권 모양 정보 상자 · 손그림 약도.
- **색은 `src/app/globals.css` 토큰만.** Tailwind 클래스(`bg-deep`, `text-ink-2`, `border-rule`)나 CSS 의 `var(--deep)` 로 쓴다. **임의 hex, `bg-[...]`/`text-[...]` 같은 임의 색 값, 인라인 `style={{ color/background }}` 금지.** 토큰을 새로 만들거나 바꾸는 건 디자인 담당 PR에서만.
  - 종이 `paper`·`paper-2`·`paper-3`·`paper-card` · 먹 `ink`·`ink-2` · 쪽빛 남색 `deep`·`deep-2`·`deep-soft` · 남색 위 글자 `on-deep`·`on-deep-2` · 해돋이 `sunrise`(장식)·`sunrise-ink`(종이 위 주황 글자)·`sunrise-pale`(남색·사진 위) · 가는 선 `rule` · 영업 중 `open` · 사진 덮개 `shade`
  - 분류색 `c-food`·`c-cafe`·`c-stay`·`c-surf`·`c-bar`·`c-spot`·`c-life` — CSS 에서는 요소에 `cat-{분류}`(놀거리 `play-{분류}`, 이야기 `story-{갈래}`)를 붙이면 `--c` 가 그 색이 된다. 약도 그림 안에서만 `map-*`.
  - 옛 이름(`sea`·`salmon`·`pine`·`sand`·`surface`·`muted`·`line` …)은 관리·인쇄 화면용으로 남겨 새 팔레트 값에 맞췄다. 공개 화면 새 코드는 새 이름을 쓴다.
- **글꼴 유틸**: 제목 `font-serif`(Noto Serif KR) · 영문 장식 이탤릭 `font-display`(Cormorant Garamond) · 본문 기본 `font-sans`(IBM Plex Sans KR) · 손글씨 `font-hand`(Nanum Pen Script — 약도 지명·짧은 주석만). CSS 에서는 `var(--serif)` 등. 새 글꼴 금지. 한글 본문은 굵기 400 이상·15px 이상(PC 16~18px)·진한 색.
- 공개 화면 지면 스타일: `magazine.css`(공통 틀·홈: `.wrap` `.sec` `.sec-head` `.label` `.it` `.rows/.row` `.noimg` `.pl` `.feature` `.story` `.more` `.btn-line`) → `magazine-places.css`(약도·장소 목록·장소 상세: `.tiles` `.grp-h` `.cover.ph-hero` `.pass` `.art-facts` `.near3`) → `magazine-pages.css`(놀거리·이야기·MY·만든 사람들). 새 화면은 이 부품을 이어 쓰고, 새 클래스는 화면 루트(`.mz-…`) 아래에 둔다.
- **사진 규칙**: 장소는 자체 사진(보여 줄 수 있는 곳만, `placeOwnPhoto`) → 없으면 **해변·명소만** 분류 대표 사진(「분류 대표 사진」 표기), **가게는 색면 표지**(분류색 + 가는 무늬 + 큰 이름) — 가게에 대표 사진을 깔면 그 가게 음식·시설로 오해된다. 판정은 `src/lib/place-photos.ts`(`placeUsesCategoryPhoto`·`placeFallbackPhoto`) 한 곳. 놀거리·이야기는 분류 대표 사진(`components/category-visual.ts`)을 쓰되 한 화면에 같은 사진이 반복되면 색면으로. 사람이 크게 나온 사진 금지, 새 사진은 `public/images/CREDITS.md` 에 한 줄.
- 공통 부품만 쓴다 (`src/components/`). 비슷한 게 있으면 새로 만들지 말고 재사용·확장한다.
  - 틀: TopNav(머리 메뉴) · BottomNav(모바일 하단) · SiteFooter · Logo · Reveal(스크롤 등장) · LangSwitch
  - 목록: CategoryTabs · FilterChips · Badge · EmptyState · SaveButton(SaveAllButton) · FallbackNote · `home/PlaceIndex` · `home/CoverShell`
  - 상세: HoursTable · MapLinks · VerifiedLine · TipList · TipForm · ReportButton · SafeImage · PhotoFrame(`PhotoCard.tsx`) · StoryPhoto
  - 이야기: StoryBody · StopCard(들른 곳 입장권) · `StoryCard.tsx`(storyAuthor·storyDateLine·StoryTypeBadge 도우미) — StoryBody·StopCard 는 관리 미리보기에서도 쓰므로 **Tailwind 토큰 클래스만**(관리 화면은 magazine CSS 를 안 불러온다)
  - 약도: `map/SketchMap`(손그림 약도) · `map/MapCard`(종이 약도 카드) · `map/MapFold` · `map/MapHost` · `map/map-places`
  - 그 밖: MenuMarks(메뉴 표시) · InstallPrompt · PwaSetup · icons · category-visual
  - 관리 화면 입력 부품은 `admin/_components/ui.tsx`.
- 화면은 **375px 폰과 1440px PC 둘 다** 완성. 모바일에서 먼저 확인하고, 가로 넘침이 없어야 한다(scrollWidth = 화면 폭).

## 문구·데이터
- 화면에 보이는 모든 문구는 `src/i18n/ko.ts` **와** `en.ts`에 **같이** 추가한다 (`en`은 `satisfies Dict`라 키가 빠지면 타입 오류). 컴포넌트에 문구를 직접 쓰지 말고 `t(lang, "key")` / `tf()`.
- 가게·메뉴·할 거리·팁 같은 **콘텐츠 데이터는 코드에 넣지 않는다.** 관리 화면(`/admin`)으로 입력한다. 코드에는 화면 구조·로직만.
- 이야기 본문에 가게 이름·영업시간을 글로 베끼지 말고 「들른 곳」 블록으로 장소·놀거리를 연결한다(가게가 바뀌면 이야기에 자동 반영).
- 샘플 행(`is_sample=true`)은 운영에서 숨겨진다(`YL_SHOW_SAMPLES=1`인 미리보기에서만 보임). 샘플 처리 규칙을 우회하지 말 것.
- 시간(영업 중 판정, 오늘 날짜)은 **Asia/Seoul 기준**, `src/lib/hours.ts`·`today.ts`를 쓴다. `new Date()`의 로컬 시간대에 의존하지 말 것.
- 메뉴 QR은 가게의 **불변 `code`**(6자리)를 쓴다. slug·이름이 바뀌어도 인쇄된 QR이 살아 있어야 한다. `code`를 바꾸거나 재생성하는 코드 금지.

## 보안 규칙 (어기면 개인정보·관리 권한이 샌다)
- 공개 화면 읽기는 **`*_public` 뷰 + `anonClient()`** 만 (`queries.ts`). 원본 테이블(`tips`, `contributors` 등)을 직접 읽지 않는다. 비공개 컬럼(연락처·기기 ID·코드 해시·역할)은 뷰에 없다.
- 쓰기는 **서버 액션 안에서만**, 먼저 `authorize()`(`src/app/admin/auth.ts`; 페이지·라우트 핸들러는 같은 파일의 `requireAdmin`/`getAdmin`)와 `can()`(`src/lib/permissions.ts`)으로 권한을 검사한 뒤 `serviceClient()`로. 레이아웃의 로그인 검사만 믿지 않는다.
- `src/lib/supabase.ts`, `session.ts`, `access-code.ts`는 서버 전용 — **클라이언트 컴포넌트(`"use client"`)에서 import 금지.** (`session.ts`·`access-code.ts`는 `server-only`가 없어 빌드가 막아 주지 않으니 특히 주의)
- `.env.local`·키·개인 코드는 절대 커밋하지 않는다. 채팅·PR·이슈에도 붙이지 않는다. 새 환경변수는 `.env.example`에 이름만 추가.
- **DB 스키마 변경은 `supabase/migrations/`에 새 번호 파일(0003_…)로만**, 소유자(이홍래) 검토 후 적용. 이미 적용된 마이그레이션 파일은 수정 금지. 참가자가 DB에 직접 SQL을 실행하지 않는다. 공개 읽기 권한 모델은 `0002_views_only.sql`이 0001 맨 위 주석의 설계를 대체했다(`supabase/README.md`).
- 권한 역할은 owner / editor / member. 편집(editor)은 콘텐츠 수정과 이야기 검토·공개까지, 삭제·팁 숨김·기여자 관리는 owner 만 (`src/lib/permissions.ts`).
- 관리자 개인 코드 발급(`scripts/issue-code.mjs`)·`scripts/setup-storage.mjs`는 소유자만 실행한다.

## 이 Next.js는 학습 데이터와 다르다
Next.js 16(+React 19)이다. 라우팅·`proxy`(구 middleware)·캐싱·서버 액션·`params`(Promise) 코드를 만지기 전에 **`node_modules/next/dist/docs/`의 해당 문서를 먼저 읽는다.** 기억대로 짜지 말 것. 페이지 props 타입은 `PageProps<"/[lang]">` 식 전역 헬퍼를 쓴다.

## 작업 방식
- **한 PR = 화면 하나 또는 기능 하나.** 관련 없는 정리·포맷 변경을 섞지 않는다.
- **`main`에 직접 푸시 금지.** 브랜치(`이름/작업`)에서 작업 → PR → CI 통과 → 소유자가 합친다.
- PR 전에 반드시 통과: `npm run lint` → `npm test` → `npx next build`. 실패하면 고치고 다시, 통과 못 한 채 PR 금지.
- 개발 서버(`npm run dev`)는 보통 써도 된다. PC가 느려지면 `npm run build && npm start`로 확인한다.
- 의존성(`npm install <패키지>`) 추가는 PR 설명에 이유를 적고 소유자에게 먼저 묻는다.
- UI를 바꾸면 ko·en 두 언어, 375px 스크린샷을 PR에 붙인다.
- 모르겠거나 위 규칙과 충돌하는 요청을 받으면 임의로 진행하지 말고 사용자에게 설명한 뒤 PM·소유자에게 물어보게 안내한다.
