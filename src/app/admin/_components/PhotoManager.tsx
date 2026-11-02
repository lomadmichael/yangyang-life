"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { makeCoverPhoto, removePlacePhoto, uploadPlacePhoto } from "../actions";
import { Notice, btnPrimary, btnSmall } from "./ui";

const MAX_EDGE = 1600;
/** 서버 액션 PHOTO_MAX_BYTES 와 같은 값. Vercel 함수 요청 한도(4.5MB)보다 작아야 413 이 안 난다 */
const MAX_BYTES = 4 * 1024 * 1024;
const TOO_BIG = "사진이 너무 커요(4MB 이하). 휴대폰에서 JPG로 저장해 다시 올려 주세요.";

/** 휴대폰 사진(수 MB·HEIC)을 긴 변 1600px JPEG 로 줄여서 올린다. 줄이기 실패하면 원본 그대로(서버가 형식·크기 검사) */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function PhotoManager({ placeId, photos }: { placeId: string; photos: { name: string; url: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();

  function upload() {
    const files = Array.from(input.current?.files ?? []);
    if (!files.length) {
      setResult({ ok: false, message: "사진을 먼저 골라 주세요." });
      return;
    }
    start(async () => {
      let last: { ok: boolean; message?: string } = { ok: true };
      for (const f of files) {
        // 줄이기 실패(예: HEIC 를 못 여는 브라우저)로 원본이 4MB 넘으면 보내기 전에 막는다 — 서버까지 가면 413
        const small = await shrink(f);
        if (small.size > MAX_BYTES) {
          last = { ok: false, message: files.length > 1 ? `「${f.name}」 ${TOO_BIG}` : TOO_BIG };
          break;
        }
        const fd = new FormData();
        fd.set("place_id", placeId);
        fd.set("file", small);
        last = await uploadPlacePhoto(fd);
        if (!last.ok) break;
      }
      setResult(last.ok ? { ok: true, message: `사진 ${files.length}장을 올렸어요.` } : last);
      if (input.current) input.current.value = "";
      router.refresh();
    });
  }

  function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      setResult(await fn());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {photos.length ? (
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((p, i) => (
            <li key={p.name} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`사진 ${i + 1}`} className="aspect-[4/3] w-full rounded-lg border border-line object-cover" />
              <div className="flex gap-1">
                {i === 0 ? (
                  <span className="inline-flex min-h-9 flex-1 items-center justify-center text-xs font-medium text-pine">대표 사진</span>
                ) : (
                  <button type="button" className={`${btnSmall} flex-1`} disabled={pending} onClick={() => act(() => makeCoverPhoto(placeId, p.name))}>
                    대표로
                  </button>
                )}
                <button
                  type="button"
                  className={btnSmall}
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm("이 사진을 뺄까요?")) act(() => removePlacePhoto(placeId, p.name));
                  }}
                >
                  빼기
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">아직 사진이 없어요.</p>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">사진 올리기</span>
        <input ref={input} type="file" accept="image/*" multiple className="text-sm file:mr-2 file:min-h-11 file:rounded-lg file:border file:border-line file:bg-surface file:px-3" />
        <span className="text-xs text-muted">한 장 4MB 이하 · 자동으로 줄여서 올려요 · 최대 12장. 사람 얼굴은 동의받은 사진만.</span>
      </label>
      <button type="button" onClick={upload} disabled={pending} className={btnPrimary}>
        {pending ? "올리는 중…" : "선택한 사진 올리기"}
      </button>
      <Notice result={result} />
    </div>
  );
}
