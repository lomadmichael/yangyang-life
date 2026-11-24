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
    <section aria-labelledby="my-install" className="flex gap-3 rounded-2xl border border-line bg-surface p-5" data-testid="my-install">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sea text-on-sea">
        <IconWave className="size-7" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 id="my-install" className="text-lg font-bold">
          {t(lang, "myInstallTitle")}
        </h2>
        <p className="mt-1">{t(lang, "myInstallBody")}</p>
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
            className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-sea px-4 font-medium text-on-sea active:bg-sea-strong disabled:opacity-60"
          >
            {t(lang, "myInstallAction")}
          </button>
        ) : (
          <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5">
            {mode === "ios" ? (
              <>
                <li>{t(lang, "myInstallIosStep1")}</li>
                <li>{t(lang, "myInstallIosStep2")}</li>
              </>
            ) : (
              <>
                <li>{t(lang, "myInstallManualStep1")}</li>
                <li>{t(lang, "myInstallManualStep2")}</li>
              </>
            )}
          </ol>
        )}
      </div>
    </section>
  );
}
