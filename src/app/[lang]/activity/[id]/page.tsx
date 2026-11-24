import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FallbackNote } from "@/components/FallbackNote";
import { MapLinks } from "@/components/MapLinks";
import { PLAY_VISUAL } from "@/components/category-visual";
import { hoodText, toMapPlaces } from "@/components/map/map-places";
import { SketchMap } from "@/components/map/SketchMap";
import { SaveButton } from "@/components/SaveButton";
import { TipList } from "@/components/TipList";
import { VerifiedLine } from "@/components/VerifiedLine";
import { isLang, pickText, t, tf, type Lang } from "@/i18n";
import { bigDateRange, formatDateRange, formatVerifiedDate, formatWeekdays, seasonLabel } from "@/lib/format";
import { CATEGORY_KEY, PLAY_CATEGORY_KEY } from "@/lib/labels";
import { playQueryString } from "@/lib/list-query";
import { neighborhoodOf, numberPlaces } from "@/lib/neighborhood";
import { coverTitleSize, placeName, placeState, type PlaceState } from "@/lib/place-view";
import { activityEnded } from "@/lib/play";
import { listActivities, listPlaces } from "@/lib/queries";
import { inMap } from "@/lib/sketch-map";
import type { Place } from "@/lib/types";

async function allPlaces(): Promise<Place[]> {
  try {
    return await listPlaces();
  } catch {
    return [];
  }
}

function stateText(lang: Lang, s: PlaceState): string {
  return s === "shut" ? t(lang, "statusClosed") : s === "open" ? t(lang, "openNow") : s === "later" ? t(lang, "closedNow") : "";
}

// 놀거리 상세 (v4, 장소 상세와 같은 틀) —
// ① 화면 가득 표지(분류 대표 사진 + 「분류 대표 사진」 표기, 사진이 없는 분류는 색면) ② 기사형 본문(소개 — DB 값만)
// + 입장권 모양 이용 정보(언제·시간·운영 계절·어디서·비 오는 날·링크·확인일 도장) ③ 연결된 장소가 있으면 확대 약도 + 그 장소 카드 ④ 팁.
export default async function ActivityPage({ params }: PageProps<"/[lang]/activity/[id]">) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const activity = (await listActivities()).find((a) => a.id === id);
  if (!activity) notFound();
  const everyone = activity.place_id ? await allPlaces() : [];
  const place = activity.place_id ? (everyone.find((p) => p.id === activity.place_id) ?? null) : null;
  const now = new Date();

  const row = activity as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const desc = pickText(row, "desc", lang);
  const location = pickText(row, "location", lang);
  const timeNote = pickText(row, "time_note", lang);
  const dated = activity.kind === "dated";
  const when = dated ? formatDateRange(activity.starts_on, activity.ends_on, lang) : formatWeekdays(activity.weekdays, lang);
  const big = dated ? bigDateRange(activity.starts_on, activity.ends_on) : null;
  const ended = activityEnded(activity, now);
  // 0003 적용 전 DB 에는 season_months 칸이 없을 수 있다. 비면(사계절) 줄을 그리지 않는다
  const season = seasonLabel(activity.season_months ?? [], lang);
  const cat = PLAY_CATEGORY_KEY[activity.category] ? t(lang, PLAY_CATEGORY_KEY[activity.category]) : activity.category;
  const kind = t(lang, dated ? "kindDated" : "kindAlways");
  // 놀거리는 자체 사진 칸이 없다 — 분류 대표 사진(이 행사의 사진이 아님 → 구석 표시)
  const photo = PLAY_VISUAL[activity.category]?.photo ?? null;
  const stamp = activity.verified_at ? activity.verified_at.slice(0, 10).replace(/-/g, ".") : null;

  const pName = place ? placeName(place, lang) : null;
  const numbers = place ? numberPlaces(everyone) : new Map<string, string>();
  const pNo = place ? (numbers.get(place.id) ?? "") : "";
  const drawable = place ? inMap(place.lat, place.lng) : false;
  const pState = place ? placeState(place, now) : "none";
  const pSummary = place ? pickText(place as unknown as Record<string, unknown>, "summary", lang) : null;
  const playHref = `/${lang}/play`;

  return (
    <div className="mz-act">
      {/* ① 표지 */}
      <section className={`cover ph-hero ${photo ? "" : "no-photo"}`} aria-label={title.text}>
        <div className="cover-media">
          <span className={`noimg play-${activity.category}`} aria-hidden="true">
            <span className="glyph">{title.text.charAt(0)}</span>
          </span>
          {photo ? (
            <div className="ph-img">
              <Image src={photo} alt="" fill priority sizes="100vw" />
            </div>
          ) : null}
        </div>
        <div className="cover-in">
          <div className="cover-meta rise">
            <span className="crumb-w">
              <Link href={playHref}>{t(lang, "playTitle")}</Link>
              {" / "}
              <Link href={`${playHref}${playQueryString({ category: activity.category })}`}>{cat}</Link>
            </span>
            <span className="label">{kind}</span>
            <span className="it">{place && pName ? pName.text : t(lang, "secPlayKicker")}</span>
          </div>
          <div className="ph-title">
            <div>
              <span className="p-no rise">{[cat, activity.rainy_ok ? t(lang, "rainyOk") : null].filter(Boolean).join(" — ")}</span>
              <h1 className={`rise d1 ${coverTitleSize(title.text)}`}>
                {title.text}
                <FallbackNote lang={lang} show={title.fallback} />
              </h1>
            </div>
            <div className="ph-side rise d2">
              {big ? (
                <p className="ph-date">
                  {big.from ? <b>{big.from}</b> : null}
                  {big.to ? (
                    <>
                      <i>—</i>
                      <b>{big.to}</b>
                    </>
                  ) : null}
                </p>
              ) : (
                <p>{when}</p>
              )}
              {location.text ? <span className="ph-where">{location.text}</span> : null}
            </div>
          </div>
          <div className="cover-foot">
            {photo ? <span className="rep">{t(lang, "categoryPhotoLabel")}</span> : <span />}
            <div className="p-acts rise d3">
              <a className="btn-solid light" href="#info">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="15" rx="1" />
                  <path d="M4 10h16M9 3v4M15 3v4" />
                </svg>
                {t(lang, "detailInfoTitle")}
              </a>
              <SaveButton kind="activity" id={activity.id} lang={lang} variant="text" className="btn-line light" />
            </div>
          </div>
        </div>
      </section>

      {/* ② 본문 + 입장권 */}
      <div className="wrap">
        <div className="p-body2">
          <article className="article">
            <span className="label kick">{t(lang, "placeAboutKicker")}</span>
            {desc.text ? (
              desc.text.length > 90 ? (
                <p className="lead">
                  {desc.text}
                  <FallbackNote lang={lang} show={desc.fallback} />
                </p>
              ) : (
                <h2>
                  {desc.text}
                  <FallbackNote lang={lang} show={desc.fallback} />
                </h2>
              )
            ) : (
              <p className="empty-note">{t(lang, "activityNoIntro")}</p>
            )}

            <dl className="art-facts">
              <div>
                <dt>{t(lang, "factCategory")}</dt>
                <dd>
                  <span className={`cat-dot play-${activity.category}`} aria-hidden="true" />
                  {cat}
                </dd>
              </div>
              <div>
                <dt>{t(lang, "factKind")}</dt>
                <dd>{kind}</dd>
              </div>
              {season ? (
                <div>
                  <dt>{t(lang, "factSeason")}</dt>
                  <dd>{season}</dd>
                </div>
              ) : null}
              {place ? (
                <div>
                  <dt>{t(lang, "factHood")}</dt>
                  <dd>{hoodText(neighborhoodOf(place), lang).name}</dd>
                </div>
              ) : null}
            </dl>

          </article>

          <aside className="pass" id="info" aria-labelledby="pass-title">
            <div className="pass-band">
              <span className="label">{t(lang, "passBand")}</span>
              <span className="it">{kind}</span>
            </div>
            <div className="pass-main">
              <h2 id="pass-title">
                {title.text}
                <FallbackNote lang={lang} show={title.fallback} />
              </h2>
              {big ? (
                <p className="pass-date" aria-hidden="true">
                  {big.from ? <b>{big.from}</b> : null}
                  {big.to ? (
                    <>
                      <i>—</i>
                      <b>{big.to}</b>
                    </>
                  ) : null}
                </p>
              ) : null}
              <dl>
                {when ? (
                  <div>
                    <dt>{t(lang, "when")}</dt>
                    <dd>{when}</dd>
                  </div>
                ) : null}
                {timeNote.text ? (
                  <div>
                    <dt>{t(lang, "passTime")}</dt>
                    <dd>
                      {timeNote.text}
                      <FallbackNote lang={lang} show={timeNote.fallback} />
                    </dd>
                  </div>
                ) : null}
                {season ? (
                  <div>
                    <dt>{t(lang, "factSeason")}</dt>
                    <dd>{season}</dd>
                  </div>
                ) : null}
                {location.text ? (
                  <div>
                    <dt>{t(lang, "where")}</dt>
                    <dd>
                      {location.text}
                      <FallbackNote lang={lang} show={location.fallback} />
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t(lang, "passRainy")}</dt>
                  <dd>{t(lang, activity.rainy_ok ? "rainyOk" : "passRainyNo")}</dd>
                </div>
                {place && pName ? (
                  <div>
                    <dt>{t(lang, "passPlace")}</dt>
                    <dd>
                      <Link className="tel" href={`/${lang}/place/${place.slug}`}>
                        {pName.text}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
              {place ? <MapLinks lat={place.lat} lng={place.lng} name={place.name_ko} lang={lang} variant="pass" /> : null}
              {activity.link ? (
                <div className="map-btns">
                  <a className="btn-solid" href={activity.link} target="_blank" rel="noopener noreferrer">
                    {t(lang, "moreLink")}
                  </a>
                </div>
              ) : null}
            </div>
            <div className="pass-stub">
              <div>
                <b className={ended ? "" : "open"}>{ended ? t(lang, "activityEnded") : kind}</b>
                <span>{dated ? when : [when, timeNote.text].filter(Boolean).join(" · ")}</span>
              </div>
              {stamp ? (
                <span className="pass-stamp" aria-label={tf(lang, "passCheckedLabel", { date: formatVerifiedDate(activity.verified_at, lang) })}>
                  <i aria-hidden="true">{t(lang, "passChecked")}</i>
                  <span aria-hidden="true">{stamp}</span>
                </span>
              ) : null}
            </div>
            <VerifiedLine method={activity.verified_method} at={activity.verified_at} by={activity.verified_by_name} lang={lang} className="src" />
          </aside>
        </div>
      </div>

      {/* ③ 연결된 장소 — 확대 약도 + 그 장소 카드 */}
      {place && pName ? (
        <section className="p-map" aria-labelledby="where-title">
          <div className="wrap">
            <header className="sec-head">
              <span className="sec-no">{pNo || "03"}</span>
              <div>
                <span className="label">{t(lang, "activityWhereKicker")}</span>
                <h2 id="where-title">{tf(lang, "activityWhereTitle", { name: pName.text })}</h2>
              </div>
              <p>{t(lang, "activityWhereLead")}</p>
            </header>
            <div className={`p-around one ${drawable ? "" : "no-map"}`}>
              {drawable ? (
                <div className="p-mapcard">
                  <span className="tape" aria-hidden="true" />
                  <div className="sheet-h">
                    <p className="hand">{t(lang, "mapFocusHint")}</p>
                    <span className="it">
                      {place.lat.toFixed(4)} N · {place.lng.toFixed(4)} E
                    </span>
                  </div>
                  <SketchMap places={toMapPlaces(everyone, numbers, lang)} lang={lang} uid="act-map" variant="focus" focusId={place.id} />
                </div>
              ) : null}
              <ol className="near3 one">
                <li data-row={place.id}>
                  <Link href={`/${lang}/place/${place.slug}`} className={`nc cat-${place.category}`}>
                    <span className="nc-d">
                      {pNo}
                      <small>{t(lang, "placeIndexShort")}</small>
                    </span>
                    <span className="nc-cat">{CATEGORY_KEY[place.category] ? t(lang, CATEGORY_KEY[place.category]) : place.category}</span>
                    <b>{pName.text}</b>
                    {pSummary?.text ? <p>{pSummary.text}</p> : null}
                    {pState === "none" ? null : (
                      <span className="nc-st">
                        <i aria-hidden="true" />
                        {stateText(lang, pState)}
                      </span>
                    )}
                  </Link>
                </li>
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {/* ④ 팁 (<section id="tips">) */}
      <div className="p-tips">
        <div className="wrap">
          <div className="p-tips-in">
            <TipList lang={lang} targetType="activity" targetId={activity.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
