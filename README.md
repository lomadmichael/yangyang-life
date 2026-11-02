# 양양생활 (YANGYANG LIFE)

양양을 찾은 방문객에게 「오늘 뭐 하지 / 어디서 먹지」를 국문·영문으로 알려 주는 안내 웹앱입니다.
양양군농업기술센터 지원 「Ai 내일바꿈 심화편」 참가자들이 함께 만듭니다. 운영 주소: https://yangyang.life

## 내 컴퓨터에서 실행 (3줄)
Node **22.18 이상**이 필요합니다 (`node --version`으로 확인).
```
npm ci
cp .env.example .env.local     # (cmd에서는 `copy`) 값은 PM에게 받아서 채웁니다 (절대 커밋 금지)
npm run dev                    # http://localhost:3000
```
컴퓨터가 느려지면 `npm run build && npm start`로 확인하세요.

## 작업 흐름
1. GitHub Projects 「양양생활 심화편」에서 내 카드를 **하는 중**으로 옮깁니다.
2. 브랜치를 만듭니다. 이름은 `이름/작업` 형식 (예: `minsu/map-view`). `main`에서 직접 작업하지 않습니다.
3. Claude Code로 작업합니다. 이 저장소의 `CLAUDE.md`를 Claude가 자동으로 읽습니다. 한 번에 화면 하나, 기능 하나만 바꿉니다.
4. `npm run lint`, `npm test`, `npx next build`가 모두 통과하는지 확인합니다.
5. PR을 올리고 템플릿(스크린샷 ko/en, 확인 목록)을 채웁니다. 카드는 **검토**로 옮깁니다.
6. CI가 초록색이 되면 소유자가 확인 후 합칩니다 (`main` 합치기는 소유자만). PR마다 Vercel 미리보기 주소가 생기니 폰으로 열어 보세요. 미리보기에는 샘플 데이터가 보입니다.

## 데이터 입력 (현장조사 팀)
가게·메뉴·할 거리는 코드가 아니라 **관리 화면(`/admin`)** 에서 입력합니다. 로그인은 소유자가 한 사람씩 발급한 **개인 코드**로 합니다 (발급은 `scripts/issue-code.mjs`, 소유자 전용).

## 소유자 전용: 개인 코드 발급
**먼저 확인:** 로컬 `.env.local`과 Vercel 환경변수의 `YL_CODE_PEPPER`·`YL_SESSION_SECRET`은 **반드시 같은 값**이어야 합니다 (둘 다 32자 이상).
발급 스크립트는 로컬 `YL_CODE_PEPPER`로 코드를 해시하고 운영 로그인은 Vercel 값으로 해시하므로, 값이 다르면 발급한 코드로 로그인이 안 됩니다.

처음 한 번, 첫 owner 코드를 만듭니다 (그대로 복사해서 실행):
```
node scripts/issue-code.mjs "이홍래" --create --role owner --team 운영 --role-label PM
```
`--create`를 붙이는 이유: 시드 데이터의 「이홍래」는 **샘플 행(`is_sample=true`)** 이라 운영에서는 「만든 사람들」에 보이지 않습니다.
`--create`는 샘플이 아닌 실데이터 기여자만 찾고, 없으면 새로 만들어 그 행에 코드를 발급합니다(샘플 행은 건드리지 않음).
그다음 참가자는 관리 화면 「기여자」에서 추가하거나 `node scripts/issue-code.mjs "이름"`으로 코드를 (재)발급합니다.

## 물어볼 곳
막히면 PM에게, 규칙·권한·DB 관련은 소유자(이홍래)에게 물어보세요. 코드 규칙 전체는 [`CLAUDE.md`](CLAUDE.md)에 있습니다.
