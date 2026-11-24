// 웹앱(PWA) 공용 값과 순수 판정 — 서버·브라우저 어디서 불러도 된다(window·document 를 직접 만지지 않는다).

/** 주소창·작업 전환 화면 색 = globals.css `--sea`(= `--deep` 쪽빛 남색) 토큰과 같은 값 (tests/pwa.test.ts 가 대조한다) */
export const THEME_COLOR = "#16294f";
/** 앱을 여는 순간 바탕 색 = globals.css `--sand`(= `--paper` 종이) 토큰과 같은 값 */
export const BACKGROUND_COLOR = "#f4f0e6";

export type InstallMode =
  /** 아무것도 보이지 않음 — 아직 기기 값을 모르거나(첫 그림) 이미 설치돼 앱으로 실행 중 */
  | "hidden"
  /** 안드로이드 크롬 등 — 브라우저가 설치 창을 띄워 줄 수 있음 → 버튼 */
  | "button"
  /** iOS — 공유 → 홈 화면에 추가 안내 글 */
  | "ios"
  /** 그 밖의 브라우저 — 브라우저 메뉴에서 추가하라는 일반 안내 글 */
  | "manual";

export type InstallEnv = {
  /** 하이드레이션 전이면 false — 서버와 첫 그림을 같게 하려고 숨긴다 */
  hydrated: boolean;
  /** display-mode: standalone 이거나 iOS navigator.standalone — 홈 화면 아이콘으로 실행 중 */
  standalone: boolean;
  /** 이번 방문에서 설치를 마쳤는지(appinstalled) */
  installed: boolean;
  isIOS: boolean;
  /** beforeinstallprompt 를 받아 둔 상태인지 */
  canPrompt: boolean;
};

/** MY 「홈 화면에 추가」 블록을 어떻게 보일지 */
export function installMode(env: InstallEnv): InstallMode {
  if (!env.hydrated || env.standalone || env.installed) return "hidden";
  if (env.canPrompt) return "button";
  if (env.isIOS) return "ios";
  return "manual";
}

/**
 * iPhone·iPad·iPod 인지. iPadOS 13+ 사파리는 데스크톱(Macintosh) UA 를 보내므로
 * 「Macintosh + 터치 지점 2개 이상」도 iPad 로 본다.
 */
export function isIOSDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}
