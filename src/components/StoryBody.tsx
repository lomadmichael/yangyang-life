import { pickText, t, type Lang } from "@/i18n";
import type { ResolvedStop } from "@/lib/story-blocks";
import type { StoryBlock } from "@/lib/types";
import { FallbackNote } from "./FallbackNote";
import { PhotoFrame } from "./PhotoCard";
import { StopCard } from "./StopCard";

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

// 읽기 폭 — 한 줄 한글 32~38자 안팎(PC 18px × 42rem). 사진은 이 폭보다 넓게(부모 단 전체).
const MEASURE = "w-full max-w-2xl";

/**
 * 이야기 본문 — 잡지 기사처럼: 문단(큰 본문 글자·넉넉한 줄 간격, 첫 문단 머리글자) · 명조 소제목 · 본문보다 넓은 사진 + 캡션 ·
 * 번호 붙은 「들른 곳」 입장권. numbered: 들른 곳에 01·02·03 번호(코스·사람). 가이드는 false 이고, 맨 위에 소제목 목차를 둔다.
 * 순수 표시 부품: 데이터는 props 로만 받고 서버 전용 모듈을 쓰지 않는다(관리 미리보기에서도 재사용).
 * 그래서 magazine CSS 없이 Tailwind 토큰 클래스만 쓴다(관리 화면은 globals.css 만 불러온다).
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
  // 첫 문단 머리글자 — 글이 문단으로 시작하고 두 줄 넘게 길 때만(짧은 한 줄에 큰 글자는 빈자리만 남긴다)
  const first = list[0];
  const firstText =
    first?.kind === "block" && first.block.t === "text" && bilingual(first.block.ko, first.block.en, lang).text.length >= 80
      ? first.key
      : undefined;

  return (
    <div className="flex flex-col gap-7 lg:gap-8">
      {toc && headings.length > 0 ? (
        <nav aria-labelledby="story-toc" className={`${MEASURE} border-y border-ink py-4`}>
          <h2 id="story-toc" className="text-sm font-semibold uppercase tracking-widest text-sunrise-ink">
            {t(lang, "storyToc")}
          </h2>
          <ol className="mt-2 flex flex-col">
            {headings.map((h) => (
              <li key={h.n} className="border-b border-rule last:border-b-0">
                <a href={`#h-${h.n}`} className="flex min-h-12 items-baseline gap-4 py-2 hover:text-deep">
                  <span className="w-8 shrink-0 font-display text-2xl italic text-deep">{String(h.n).padStart(2, "0")}</span>
                  <span className="font-serif text-lg font-semibold">
                    {h.text.text}
                    <FallbackNote lang={lang} show={h.text.fallback} />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {list.map((p) => {
        if (p.kind === "stops") {
          return (
            <ul key={p.key} aria-label={t(lang, "storyStops")} className={`${MEASURE} my-2 flex flex-col gap-3`}>
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
            <h2
              key={p.key}
              id={`h-${p.heading}`}
              className={`${MEASURE} scroll-mt-28 border-t border-ink pt-5 font-serif text-2xl font-semibold leading-snug tracking-tight lg:mt-4 lg:text-3xl`}
            >
              {text.text}
              <FallbackNote lang={lang} show={text.fallback} />
            </h2>
          );
        }
        if (b.t === "text") {
          const text = bilingual(b.ko, b.en, lang);
          const lead = p.key === firstText;
          return (
            <p
              key={p.key}
              className={`${MEASURE} whitespace-pre-line text-base leading-8 text-ink lg:text-lg lg:leading-9 ${
                lead
                  ? "first-letter:float-left first-letter:mr-3 first-letter:mt-1.5 first-letter:font-serif first-letter:text-6xl first-letter:font-semibold first-letter:leading-none first-letter:text-deep"
                  : ""
              }`}
            >
              {text.text}
              <FallbackNote lang={lang} show={text.fallback} />
            </p>
          );
        }
        const caption = bilingual(b.caption_ko, b.caption_en, lang);
        return (
          <figure key={p.key} className="my-2 flex w-full flex-col gap-3 lg:my-6">
            <PhotoFrame src={b.url} alt={caption.text || t(lang, "storyPhotoAlt")} className="aspect-3/2 w-full" />
            {caption.text ? (
              <figcaption className={`${MEASURE} border-l-2 border-sunrise pl-3 text-sm leading-relaxed text-ink-2 lg:text-base`}>
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
