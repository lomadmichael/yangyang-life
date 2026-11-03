# supabase/

- `migrations/` — 번호 순서대로 적용된 스키마. **이미 적용된 파일은 고치지 않는다** (주석 한 줄도). 바꿀 게 있으면 새 번호 파일(`0003_…`)로, 소유자(이홍래) 검토 후 적용.
- `seed.sql` — 샘플 데이터(`is_sample=true`). 운영에서는 숨겨지고 `YL_SHOW_SAMPLES=1`(로컬·Vercel Preview)에서만 보인다.
- `seed_v2.sql` — v2 샘플(해변·생활 편의 장소, 놀거리 분류·계절, 이야기 3편, 기여자 한유나·박하늘). `0003` 적용 후 `seed.sql` 다음에 실행. 다시 돌려도 안전.

## 공개 읽기 보안 모델 — 0002 가 0001 을 대체함

`0001_init.sql` 맨 위 주석은 **처음 설계(지금은 폐기)** 를 설명한다:
security_invoker 뷰 + anon 에게 원본 테이블 컬럼 단위 GRANT. 이 방식은 anon 이 원본 테이블을 직접 읽어
뷰의 필터(`show=false` 제외·샘플 필터·참여 가게 한정)를 우회할 수 있어서 리뷰에서 막혔다.

**지금 적용된 모델은 `0002_views_only.sql`** 이다:

- anon / authenticated 는 원본 테이블(`contributors`, `places`, `menu_items`, `activities`, `tips`, `tip_reports`)에 **권한 0** (RLS 켜 둔 채 정책 0개).
- 공개 창구는 `*_public` 뷰뿐 — security definer 뷰(소유자 postgres)라서 뷰가 필터와 컬럼 선택을 직접 책임진다. anon 에게는 뷰 SELECT 만 GRANT.
- Supabase advisor 의 `security_definer_view` 경고는 이 설계상 의도된 것.
- 쓰기는 전부 서버의 service role 에서만 (`src/app/admin/actions.ts`, `src/app/[lang]/tips/actions.ts`).

0001 을 읽을 때는 테이블·제약·함수 정의만 참고하고, 권한·뷰 부분은 0002 를 기준으로 본다.

## 0003 — v2 확장 (`0003_v2_axes.sql`)

장소 분류를 7종(`food·cafe·stay·surf·bar·spot·life`, 옛 `shop` 은 `life` 로 옮김)으로 넓히고 편의 `amenities`(화장실·샤워장)를 더한다.
놀거리에 분류 8종 `category`(기존 행은 요가 → `yoga`, 기간 행사 → `festival`, 나머지 → `village` 로 채움)와 운영하는 달 `season_months`(빈 배열 = 사계절)를 더한다.
기여자 역할에 `editor`(콘텐츠 수정 + 이야기 공개)를 더하고, 이야기 `stories` 테이블(본문은 `blocks` jsonb 배열, 상태 `draft → review → returned/published`)을 새로 만든다 — 원본은 0002 와 같이 anon 권한 0.
공개 창구는 `stories_public`(공개된 이야기만, 검토 메모·상태 제외) 하나이고, `places_public`·`activities_public` 은 새 칸을 맨 끝에 붙여 `create or replace`, `tips_public` 은 팁 대상 `story` 의 샘플 판정을 더해 다시 만든다. 한 트랜잭션으로 적용된다.
