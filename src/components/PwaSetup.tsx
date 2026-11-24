"use client";

import { useEffect } from "react";

// 웹앱(PWA) 준비 — [lang] 레이아웃에 한 번 붙는다. 화면에는 아무것도 그리지 않는다.
// 1) 운영(production)에서만 서비스 워커(public/sw.js) 등록 — 오프라인 안내 화면용
// 2) 안드로이드 크롬의 beforeinstallprompt 를 일찍 받아 둔다. 이 이벤트는 페이지를 처음 열 때 한 번만 오므로,
//    홈에서 열고 MY 로 옮겨 가도 MY 의 「홈 화면에 추가」 버튼(InstallPrompt)이 쓸 수 있게 보관한다.
// 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.

/** 크롬 계열만 있는 이벤트라 DOM 타입에 없다 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = { event: BeforeInstallPromptEvent | null; installed: boolean };

let state: InstallState = { event: null, installed: false };
const listeners = new Set<() => void>();
let captured = false;

function emit(next: InstallState) {
  state = next;
  listeners.forEach((l) => l());
}

function capture() {
  if (captured || typeof window === "undefined") return;
  captured = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    emit({ ...state, event: e as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => {
    emit({ event: null, installed: true });
  });
}

// 스크립트가 읽히는 즉시(하이드레이션 전) 귀를 연다 — 이벤트가 일찍 와도 놓치지 않게
capture();

export function subscribeInstall(listener: () => void): () => void {
  capture();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallState(): InstallState {
  return state;
}

const SERVER_STATE: InstallState = { event: null, installed: false };
export function getServerInstallState(): InstallState {
  return SERVER_STATE;
}

/** 설치 창을 띄운 뒤 받아 둔 이벤트를 비운다(한 번 쓰면 다시 못 씀) */
export async function promptInstall(): Promise<void> {
  const e = state.event;
  if (!e) return;
  emit({ ...state, event: null });
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === "accepted") emit({ event: null, installed: true });
}

export function PwaSetup() {
  useEffect(() => {
    capture();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // 등록 실패는 조용히 — 앱은 서비스 워커 없이도 그대로 동작한다
    });
  }, []);
  return null;
}
