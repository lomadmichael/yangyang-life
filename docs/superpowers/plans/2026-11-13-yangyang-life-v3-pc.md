# 양양생활 v3 — PC 화면 · 웹앱(PWA) · 사진 Implementation Plan

> **For agentic workers:** 작업 하나씩 구현한다. 각 작업은 `npm run lint && npm test && npx next build` 통과 + 스크린샷 확인으로 끝난다.

**Goal:** 모바일 한 벌인 공개 화면에 헤이설악 구성 수준의 PC 화면(1024px 이상)을 더하고, 홈 화면 추가(PWA)와 사진 중심 마감을 넣는다.

**Architecture:** 같은 라우트·같은 데이터로 반응형만 더한다(별도 PC 라우트 없음). 기준점은 Tailwind `lg`(1024px). `lg` 미만은 지금 화면 그대로(하단 메뉴), `lg` 이상은 상단 메뉴 + 넓은 단(`max-w-6xl`) + 격자·2단 배치. 서버 컴포넌트·조회 함수는 그대로 쓴다.

**Spec:** `C:\Users\hongk\Desktop\Lomad\사업관련\농촌마을활력화사업\Ai내일바꿈\4기 심화편\양양생활_세부플랜_v3.md` §0-A · 기능 `yangyang-design\prd-yangyang-v2.md`

## Global Constraints
- 저장소 `CLAUDE.md` 전부. 색은 토큰 클래스만(임의 hex·`bg-[...]`·인라인 color 금지), 글꼴 Noto Sans KR 400/500/700, 문구는 ko.ts·en.ts 둘 다
- **모바일(375px) 화면은 깨뜨리지 않는다** — 바꾼 화면마다 375px·1440px 두 폭 스크린샷
- 한글 본문은 15px 이상·굵기 400·`text-ink`(가늘고 옅은 회색 작은 글씨 금지). 보조 글만 `text-muted`
- 공개 읽기는 `*_public` 뷰만, 쓰기는 서버 액션 + authorize. DB 스키마 변경은 새 마이그레이션 파일만 쓰고 **실행하지 않는다**
- `next dev` 금지 → `npx next build && npx next start -p 3100`, 끝나면 서버·포트 정리
- 새 npm 패키지 금지. `git add -A` 금지. 줄바꿈 LF. 푸시·합치기는 메인이 한다
- 사진 자산은 `public/images/`(디자인 자산: 홈 히어로·분류 대표). 가게 사진은 지금처럼 Storage. 얼굴이 식별되는 사진 금지
- PC 기준(헤이설악 실사): 상단 메뉴 / 전면 사진 히어로 + 큰 제목 + 목적 칩 / 큰 제목 단락 + 「전체 보기 →」 / 가로 카드 줄·사진 위 글자 카드·3단 카드 / 숫자 띠 / 목록 = 큰 제목·분류 탭(개수)·필터 줄·격자 / 상세 = 둥근 대형 사진에 제목 겹침·요약·확인 표기·본문 + 오른쪽 고정 정보 카드

## Tasks
1. **틀**: `[lang]/layout.tsx` — `lg` 이상 상단 메뉴(로고 · 홈/장소/놀거리/이야기/MY · 언어 전환, 현재 칸 표시는 BottomNav의 `activeTab` 재사용), `BottomNav`는 `lg:hidden`, 본문 단 `max-w-md lg:max-w-6xl`, 푸터 PC 배치. 새 부품 `TopNav`, `SectionHeader({title, href?, moreLabel?})`. 사진 위 글자 카드용 공용 부품 `PhotoCard`(사진 없으면 분류 아이콘 바탕).
2. **목록 3종**(장소·놀거리·이야기): `lg` 이상 큰 제목 + 분류 탭에 개수 + 필터 줄 + 3단 격자. 카드에 사진 영역(없으면 아이콘 바탕)을 넣어 격자에서 초라하지 않게.
3. **상세 3종**(장소·놀거리·이야기/가이드): `lg` 이상 둥근 대형 사진에 제목 겹침, 본문(왼쪽) + 고정 정보 카드(오른쪽: 주소·영업시간·지도 버튼·확인 표기·전화). 이야기는 본문 폭 제한(읽기 폭) + 옆에 들른 곳 요약 목록. 전화 칸은 DB에 아직 없으므로 0004 마이그레이션(`places.phone`)을 쓰고 뷰에 추가 — 파일만.
4. **홈**: 전면 히어로(사진 `public/images/hero-*.jpg`, 어두운 덮개 + 큰 제목 + 목적 칩 6개: 지금 열린 곳·비 오는 날·차 없이·영어 메뉴·해변·이야기), 지금 열린 곳 가로 줄, 이번 주 놀거리 3단, 분류 바로가기(사진 카드), 새 이야기 3단, 숫자 띠(장소 n · 놀거리 n · 이야기 n · 만든 사람 n — 실제 조회값), 만든 사람들 띠. 모바일도 같은 순서로 히어로 축소판.
5. **웹앱(PWA)**: `app/manifest.ts`(이름 양양생활/YANGYANG LIFE, theme sea, 아이콘 192·512·maskable), 아이콘 생성(파도 아이콘 + sea 바탕, 스크립트로 PNG), apple-touch-icon·theme-color 메타, 간단한 서비스 워커(오프라인 안내 페이지만, 데이터 캐시 없음), MY에 「홈 화면에 추가」 안내(안드로이드 설치 버튼·iOS 공유 메뉴 안내).
6. **MY 참여 문의**: 「참여 문의 010-9542-3775」(tel 링크) — 번호는 `NEXT_PUBLIC_YL_CONTACT_PHONE` 환경변수(없으면 줄 숨김), `.env.example`에 이름 추가.
7. **0004 마이그레이션(파일만)**: `places.phone text`, `places_public`에 phone 추가, 사진 노출 규칙을 `status='participating' or category='spot'`로.
