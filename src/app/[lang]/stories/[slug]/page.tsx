import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FallbackNote } from "@/components/FallbackNote";
import { IconAlert } from "@/components/icons";
import { SketchMap, type MapPlace } from "@/components/map/SketchMap";
import { SafeImage } from "@/components/SafeImage";
import { SaveAllButton, SaveButton } from "@/components/SaveButton";
import { StoryBody } from "@/components/StoryBody";
import { STORY_VISUAL } from "@/components/category-visual";
import { storyAuthor, storyDateLine } from "@/components/StoryCard";
import { TipList } from "@/components/TipList";
import { isLang, pickText, t, tf, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import { storiesQueryString } from "@/lib/list-query";
import { CATEGORY_KEY, STORY_TAG_KEY, STORY_TYPE_KEY } from "@/lib/labels";
import { coverTitleSize, placeName } from "@/lib/place-view";
import { getStoryBySlug, listActivitiesByIds, listPlacesByIds } from "@/lib/queries";
import { inMap } from "@/lib/sketch-map";
import { GUIDE_STALE_DAYS, isStale } from "@/lib/stale";
import { resolveStops, savablePlaceIds, stopTargets, stopView, type ResolvedStop } from "@/lib/story-blocks";

/** 옆 색인의 들른 곳 한 줄 — 지금의 장소·놀거리 이름(사라진 곳은 안내 문구) */
function stopLine(s: ResolvedStop, lang: Lang, now: Date): { label: string; href: string | null } {
  const view = stopView(s, now);
  if (s.place) return { label: placeName(s.place, lang).text, href: view.href };
  if (s.activity) return { label: pickText(s.activity as unknown as Record<string, unknown>, "title", lang).text, href: view.href };
  return { label: t(lang, "stopMissingNote"), href: null };
}

/** 들른 곳 가운데 약도에 찍을 수 있는 장소 — 핀 번호 = 들른 곳 번호(같은 장소가 두 번 나오면 처음 번호) */
function stopPins(resolved: ResolvedStop[], lang: Lang): MapPlace[] {
  const seen = new Set<string>();
  const out: MapPlace[] = [];
  for (const s of resolved) {
    const p = s.place;
    if (!p || s.state === "missing" || seen.has(p.id) || !inMap(p.lat, p.lng)) continue;
    seen.add(p.id);
    out.push({
      id: p.id,
      no: String(s.n).padStart(2, "0"),
      cat: p.category,
      catLabel: CATEGORY_KEY[p.category] ? t(lang, CATEGORY_KEY[p.category]) : p.category,
      name: placeName(p, lang).text,
      href: `/${lang}/place/${p.slug}`,
      lat: p.lat,
      lng: p.lng,
    });
  }
  return out;
}

// 이야기 상세 (v4 — 이 디자인의 꽃, 잡지 기사) —
// ① 화면 가득 표지(표지 사진, 없으면 갈래 대표 사진 + 표기) 위 큰 명조 제목·요약·글쓴이·날짜
// ② 본문(읽기 좋은 폭·큰 글자·명조 소제목·넓은 사진·번호 붙은 들른 곳 입장권) + PC 옆 단(글쓴이 · 들른 곳 번호 색인 · 모두 저장 · 들른 곳 약도)
// ③ 팁. 들른 곳은 늘 지금의 장소·놀거리 값(휴업·삭제 표시는 StopCard). 가이드가 오래되면 표지 아래 경고 띠.
export default async function StoryPage({ params }: PageProps<"/[lang]/stories/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 들른 곳의 영업 여부는 요청 시각 기준

  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  // 들른 곳은 id 만 저장돼 있다 → 지금의 장소·놀거리 값을 불러와 그린다(R20). 공개 뷰에 없으면 missing 카드
  const blocks = Array.isArray(story.blocks) ? story.blocks : [];
  const { placeIds, activityIds } = stopTargets(blocks);
  const [places, activities] = await Promise.all([listPlacesByIds(placeIds), listActivitiesByIds(activityIds)]);
  const resolved = resolveStops(
    blocks,
    new Map(places.map((p) => [p.id, p])),
    new Map(activities.map((a) => [a.id, a])),
  );

  const now = new Date();
  const guide = story.type === "guide";
  const stale = guide && isStale(story.verified_at ?? story.published_at, now, GUIDE_STALE_DAYS);
  const row = story as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const summary = pickText(row, "summary", lang);
  const author = storyAuthor(story);
  const dateLine = storyDateLine(story, lang);
  const typeLabel = STORY_TYPE_KEY[story.type] ? t(lang, STORY_TYPE_KEY[story.type]) : story.type;
  const tags = (story.tags ?? []).filter((k) => STORY_TAG_KEY[k]).map((k) => t(lang, STORY_TAG_KEY[k]));
  const saveIds = guide ? [] : savablePlaceIds(resolved);
  const typePhoto = STORY_VISUAL[story.type]?.photo ?? null;
  const usesTypePhoto = !story.cover_photo && !!typePhoto;
  const pins = stopPins(resolved, lang);
  const initial = story.author_name?.trim().charAt(0) ?? "";

  const saveAll =
    saveIds.length > 0 ? (
      <SaveAllButton placeIds={saveIds} lang={lang} label={t(lang, story.type === "course" ? "saveAllCourse" : "saveAllStory")} />
    ) : null;

  return (
    <div className="mz-story">
      {/* ① 표지 */}
      <section
        className={`cover ph-hero st-hero ${story.cover_photo || typePhoto ? "" : "no-photo"}`}
        aria-label={title.text}
      >
        <div className="cover-media">
          <span className={`noimg story-${story.type}`} aria-hidden="true">
            <span className="glyph">{title.text.charAt(0)}</span>
          </span>
          {story.cover_photo ? (
            <SafeImage
              src={photoUrl(story.cover_photo)}
              alt={title.text}
              fallbackSrc={typePhoto}
              fallbackLabel={t(lang, "categoryPhotoLabel")}
            />
          ) : typePhoto ? (
            <div className="ph-img">
              <Image src={typePhoto} alt="" fill priority sizes="100vw" />
            </div>
          ) : null}
        </div>
        <div className="cover-in">
          <div className="cover-meta rise">
            <span className="crumb-w">
              <Link href={`/${lang}/stories`}>{t(lang, "storiesTitle")}</Link>
              {" / "}
              <Link href={`/${lang}/stories${storiesQueryString({ type: story.type })}`}>{typeLabel}</Link>
            </span>
            <span className="label">{t(lang, "secStoriesKicker")}</span>
            <span className="it">{t(lang, "coverIssueSeason")}</span>
          </div>
          <div className="ph-title">
            <div>
              <span className="p-no rise">{[typeLabel, ...tags].join(" · ")}</span>
              <h1 className={`rise d1 ${coverTitleSize(title.text)}`}>{title.text}</h1>
            </div>
            <div className="ph-side rise d2">
              {summary.text ? (
                <p>
                  {summary.text}
                  <FallbackNote lang={lang} show={summary.fallback} />
                </p>
              ) : null}
              {author || dateLine ? (
                <span className="st-by">
                  {author ? <b>{tf(lang, "storyByline", { name: author })}</b> : null}
                  {dateLine ? <span>{dateLine}</span> : null}
                </span>
              ) : null}
            </div>
          </div>
          <div className="cover-foot">
            {usesTypePhoto ? <span className="rep">{t(lang, "categoryPhotoLabel")}</span> : <span />}
            <div className="p-acts rise d3">
              <a className="btn-solid light" href="#story-body">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" />
                </svg>
                {t(lang, "storyRead")}
              </a>
              <SaveButton kind="story" id={story.id} lang={lang} variant="text" className="btn-line light" />
            </div>
          </div>
        </div>
      </section>

      {stale ? (
        <div role="note" className="st-stale">
          <div className="wrap">
            <IconAlert className="st-stale-ic" />
            <p>
              <b>{t(lang, "guideStaleTitle")}</b>
              {t(lang, "guideStaleBody")}
            </p>
          </div>
        </div>
      ) : null}

      {/* ② 본문 + 옆 단 */}
      <div className="wrap">
        <div className={`st-grid ${resolved.length || author ? "" : "no-side"}`}>
          <article className="st-main" id="story-body">
            <StoryBody blocks={blocks} resolved={resolved} lang={lang} numbered={!guide} now={now} />
            <p className="st-end">
              <i aria-hidden="true" />
              {[author ? tf(lang, "storyByline", { name: author }) : "", dateLine].filter(Boolean).join(" · ")}
            </p>
          </article>

          <aside className="st-side" aria-label={t(lang, "storyStops")}>
            {author ? (
              <div className="st-author">
                <span className="av" aria-hidden="true">
                  {initial}
                </span>
                <div>
                  <span className="label">{t(lang, "storyWriter")}</span>
                  <b>{story.author_name}</b>
                  {story.author_team ? <small>{story.author_team}</small> : null}
                  {story.author_id ? (
                    <Link className="more" href={`/${lang}/stories${storiesQueryString({ author: story.author_id })}`}>
                      {t(lang, "storyMoreByAuthor")}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
            {resolved.length > 0 ? (
              <section className="st-stops">
                <h2 className="label">{t(lang, "storyStops")}</h2>
                <ol>
                  {resolved.map((s) => {
                    const line = stopLine(s, lang, now);
                    const no = <span className="n">{guide ? "·" : String(s.n).padStart(2, "0")}</span>;
                    return (
                      <li key={s.n} className={s.state === "closed" ? "is-closed" : s.state === "missing" ? "is-missing" : ""}>
                        {line.href ? (
                          <Link href={`/${lang}${line.href}`}>
                            {no}
                            <span>{line.label}</span>
                          </Link>
                        ) : (
                          <span className="gone">
                            {no}
                            <span>{line.label}</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}
            {saveAll ? <div className="st-saveall">{saveAll}</div> : null}
            {pins.length > 0 ? (
              <div className="st-map idx-mapcard">
                <div className="sheet-h">
                  <p className="hand">{t(lang, "storyMapHint")}</p>
                  <span className="it">{t(lang, "mapSheetTitle")}</span>
                </div>
                <SketchMap places={pins} lang={lang} uid="story-map" />
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {/* ③ 팁 (<section id="tips">) */}
      <div className="p-tips">
        <div className="wrap">
          <div className="p-tips-in">
            <TipList lang={lang} targetType="story" targetId={story.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
