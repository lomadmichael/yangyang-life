"use client";

import { useState, useSyncExternalStore } from "react";
import { t, type Lang } from "@/i18n";
import { installMode, isIOSDevice } from "@/lib/pwa";
import { IconWave } from "./icons";
import { getInstallState, getServerInstallState, promptInstall, subscribeInstall } from "./PwaSetup";

// MY 「홈 화면에 추가」 안내 블록.
// - 안드로이드 크롬 등: 받아 둔 beforeinstallprompt 로 「홈 화면에 추가」 버튼
// - iOS: 공유 → 홈 화면에 추가 설명 글 (iOS 는 설치 창을 띄우는 API 가 없다)
// - 그 밖: 브라우저 메뉴에서 추가하라는 글
// - 이미 홈 화면 아이콘으로 실행 중(display-mode: standalone)이면 숨김
// 서버 전용 모듈은 import 하지 않는다.

type Device = { standalone: boolean; isIOS: boolean };

const SERVER_DEVICE: Device = { standalone: false, isIOS: false };
let cachedDevice: Device | null = null;

function readDevice(): Device {
  if (cachedDevice) return cachedDevice;
  const nav = navigator as Navigator & { standalone?: boolean };
  cachedDevice = {
    standalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
    isIOS: isIOSDevice(nav.userAgent, nav.maxTouchPoints ?? 0),
  };
  return cachedDevice;
}

const noopSubscribe = () => () => {};

export function InstallPrompt({ lang }: { lang: Lang }) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const device = useSyncExternalStore(noopSubscribe, readDevice, () => SERVER_DEVICE);
  const install = useSyncExternalStore(subscribeInstall, getInstallState, getServerInstallState);
  const [busy, setBusy] = useState(false);

  const mode = installMode({
    hydrated,
    standalone: device.standalone,
    installed: install.installed,
    isIOS: device.isIOS,
    canPrompt: install.event !== null,
  });
  if (mode === "hidden") return null;

  return (
    <section aria-labelledby="my-install" className="my-box" data-testid="my-install">
      <h2 id="my-install" className="label">
        {t(lang, "myInstallTitle")}
      </h2>
      <p className="mt-2 text-base text-ink">{t(lang, "myInstallBody")}</p>
      {mode === "button" ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await promptInstall();
            } finally {
              setBusy(false);
            }
          }}
          className="mt-4 inline-flex min-h-12 items-center gap-2 bg-deep px-5 font-semibold text-on-deep hover:bg-ink disabled:opacity-60"
        >
          <IconWave className="size-5" />
          {t(lang, "myInstallAction")}
        </button>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {(mode === "ios" ? (["myInstallIosStep1", "myInstallIosStep2"] as const) : (["myInstallManualStep1", "myInstallManualStep2"] as const)).map(
            (k, i) => (
              <li key={k} className="flex gap-3 text-base">
                <span className="font-display text-2xl italic leading-none text-deep">{i + 1}</span>
                <span>{t(lang, k)}</span>
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}
