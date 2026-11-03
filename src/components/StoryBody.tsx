import { pickText, t, type Lang } from "@/i18n";
import type { ResolvedStop } from "@/lib/story-blocks";
import type { StoryBlock } from "@/lib/types";
import { FallbackNote } from "./FallbackNote";
import { StopCard } from "./StopCard";
import { PhotoFrame } from "./StoryCard";

type Piece =
  | { kind: "block"; block: Exclude<StoryBlock, { t: "stop" }>; key: number; heading?: number }
  | { kind: "stops"; stops: ResolvedStop[]; key: number };

/** 블록을 그릴 조각으로 — 이어진 들른 곳은 한 목록으로 묶고, 소제목엔 1부터 번호(앵커 #h-{번호})를 붙인다 */
function pieces(blocks: StoryBlock[], resolved: ResolvedStop[]): Piece[] {
  const out: Piece[] = [];
  let stopIndex = 0;
  let headingIndex = 0;
  blocks.forEach((block, i) => {
    if (block.t === "stop") {
      const stop = resolved[stopIndex++];
      if (!stop) return;
      const last = out[out.length - 1];
      if (last?.kind === "stops") last.stops.push(stop);
      else out.push({ kind: "stops", stops: [stop], key: i });
      return;
    }
    if (block.t === "heading") out.push({ kind: "block", block, key: i, heading: ++headingIndex });
    else out.push({ kind: "block", block, key: i });
  });
  return out;
}

function bilingual(ko: string | null, en: string | null, lang: Lang) {
  return pickText({ x_ko: ko, x_en: en }, "x", lang);
}

/**
 * 이야기 본문 — 문단·소제목·사진·들른 곳을 순서대로 그린다.
 * numbered: 들른 곳에 1·2·3 번호(코스·사람). 가이드는 false 이고, 맨 위에 소제목 목차를 둔다.
 * 순수 표시 부품: 데이터는 props 로만 받고 서버 전용 모듈을 쓰지 않는다(관리 미리보기에서도 재사용).
 */
export function StoryBody({
  blocks,
  resolved,
  lang,
  numbered,
  toc = !numbered,
  now = new Date(),
}: {
  blocks: StoryBlock[];
  /** resolveStops(blocks, …) 결과 — stop 블록 순서와 같다 */
  resolved: ResolvedStop[];
  lang: Lang;
  numbered: boolean;
  /** 맨 위 소제목 목차 (기본: 번호 없는 가이드에서만) */
  toc?: boolean;
  /** 영업 중 판정 시각 */
  now?: Date;
}) {
  const list = pieces(blocks, resolved);
  const headings = list.flatMap((p) =>
    p.kind === "block" && p.block.t === "heading" && p.heading
      ? [{ n: p.heading, text: bilingual(p.block.ko, p.block.en, lang) }]
      : [],
  );

  return (
    <div className="flex flex-col gap-4">
      {toc && headings.length > 0 ? (
        <nav aria-labelledby="story-toc" className="rounded-2xl border border-line bg-surface px-4 py-3">
          <h2 id="story-toc" className="font-bold">
            {t(lang, "storyToc")}
          </h2>
          <ol className="mt-1 flex flex-col">
            {headings.map((h) => (
              <li key={h.n}>
                <a href={`#h-${h.n}`} className="flex min-h-11 items-center justify-between gap-3 text-sea">
                  <span>
                    {h.text.text}
                    <FallbackNote lang={lang} show={h.text.fallback} />
                  </span>
                  <span aria-hidden="true">›</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {list.map((p) => {
        if (p.kind === "stops") {
          return (
            <ul key={p.key} aria-label={t(lang, "storyStops")} className="flex flex-col gap-2">
              {p.stops.map((s) => (
                <li key={s.n}>
                  <StopCard stop={s} lang={lang} numbered={numbered} now={now} />
                </li>
              ))}
            </ul>
          );
        }
        const b = p.block;
        if (b.t === "heading") {
          const text = bilingual(b.ko, b.en, lang);
          return (
            <h2 key={p.key} id={`h-${p.heading}`} className="scroll-mt-4 pt-2 text-xl font-bold leading-snug">
              {text.text}
              <FallbackNote lang={lang} show={text.fallback} />
            </h2>
          );
        }
        if (b.t === "text") {
          const text = bilingual(b.ko, b.en, lang);
          return (
            <p key={p.key} className="whitespace-pre-line leading-relaxed">
              {text.text}
              <FallbackNote lang={lang} show={text.fallback} />
            </p>
          );
        }
        const caption = bilingual(b.caption_ko, b.caption_en, lang);
        return (
          <figure key={p.key} className="flex flex-col gap-1.5">
            <PhotoFrame
              src={b.url}
              alt={caption.text || t(lang, "storyPhotoAlt")}
              className="aspect-4/3 w-full rounded-2xl"
            />
            {caption.text ? (
              <figcaption className="text-sm text-muted">
                {caption.text}
                <FallbackNote lang={lang} show={caption.fallback} />
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}
