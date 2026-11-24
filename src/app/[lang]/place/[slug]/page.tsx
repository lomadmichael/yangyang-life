import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FallbackNote } from "@/components/FallbackNote";
import { HoursTable } from "@/components/HoursTable";
import { MapLinks } from "@/components/MapLinks";
import { FALLBACK_VISUAL, PLACE_VISUAL, PLAY_VISUAL } from "@/components/category-visual";
import { hoodText, toMapPlaces } from "@/components/map/map-places";
import { SketchMap } from "@/components/map/SketchMap";
import { isAmenityCategory } from "@/components/PlaceCard";
import { SaveButton } from "@/components/SaveButton";
import { SafeImage } from "@/components/SafeImage";
import { StoryPhoto } from "@/components/StoryPhoto";
import { TipList } from "@/components/TipList";
import { VerifiedLine } from "@/components/VerifiedLine";
import { isLang, pickText, t, tf, type DictKey, type Lang } from "@/i18n";
import { activityWhen, formatVerifiedDate, photoUrl, WEEKDAY_KEYS } from "@/lib/format";
import { seoulParts } from "@/lib/hours";
import { placesQueryString } from "@/lib/list-query";
import { AMENITY_KEY, CATEGORY_KEY, PLAY_CATEGORY_KEY, PRICE_KEY, STORY_TYPE_KEY, priceSymbol } from "@/lib/labels";
import { neighborhoodOf, numberPlaces } from "@/lib/neighborhood";
import { canShowPlacePhotos, placePhone, telHref } from "@/lib/place-photos";
import { hasHours, placeName, placeState, todayHoursText, WEEK_MON_FIRST, type PlaceState } from "@/lib/place-view";
import { placeActivities } from "@/lib/play";
import { getPlaceBySlug, listActivities, listPlaces, listStoriesMentioning } from "@/lib/queries";
import { formatDistance, inMap, nearest } from "@/lib/sketch-map";
import type { Activity, Place, Story } from "@/lib/types";

// 아래 묶음은 곁가지 — 조회가 실패해도(예: 0003 적용 전 stories_public 없음) 상세 화면은 그대로 보여 준다
async function storiesFor(placeId: string): Promise<Story[]> {
  try {
    return await listStoriesMentioning("place", placeId);
  } catch {
    return [];
  }
}

async function activitiesAt(placeId: string): Promise<Activity[]> {
  try {
    return (await listActivities()).filter((a) => a.place_id === placeId);
  } catch {
    return [];
  }
}

async function allPlaces(): Promise<Place[]> {
  try {
    return await listPlaces();
  } catch {
    return [];
  }
}

function yesNo(lang: Lang, v: boolean | null): string {
  const key: DictKey = v === null ? "unknown" : v ? "yes" : "no";
  return t(lang, key);
}

function stateText(lang: Lang, s: PlaceState): string {
  return s === "shut"
    ? t(lang, "statusClosed")
    : s === "open"
      ? t(lang, "openNow")
      : s === "later"
        ? t(lang, "closedNow")
        : t(lang, "hoursUnknown");
}

/** 표지 제목 크기 — 글자 수에 맞춰 네 단계(영문은 한 글자가 좁아 절반 남짓으로 센다) */
function titleSize(name: string): string {
  const chars = [...name];
  const hangul = chars.filter((c) => /[ㄱ-힣]/.test(c)).length;
  const w = hangul + (chars.length - hangul) * 0.55;
  if (w <= 3.6) return "sz-xl";
  if (w <= 5.8) return "sz-l";
  if (w <= 10) return "sz-m";
  return "sz-s";
}

const Arrow = () => (
  <svg viewBox="0 0 20 12" aria-hidden="true">
    <path d="M0 6h18M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// 장소 상세 (v4, 디자인 명세 yangyang-design/out/v3/d/place.html) —
// ① 화면 가득 사진 위 큰 제목 ② 잡지 기사형 본문(소개·가는 법 — DB 값만) + 입장권 모양 이용 정보
// ③ 확대 약도 + 근처 세 곳(직선거리) ④ 이 장소가 나오는 이야기 ⑤ 이 장소의 놀거리 ⑥ 팁·정보 수정 제보.
// 연결된 것이 없는 단락은 그리지 않는다. 모바일은 이용 정보가 본문 앞.
export default async function PlacePage({ params }: PageProps<"/[lang]/place/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const [stories, activitiesHere, everyone] = await Promise.all([storiesFor(place.id), activitiesAt(place.id), allPlaces()]);
  const now = new Date();
  // 끝난 기간 행사는 빼고, 비시즌(서울 이번 달 기준)은 뒤로 보내 흐리게
  const activities = placeActivities(activitiesHere, now);
  const all = everyone.some((p) => p.id === place.id) ? everyone : [...everyone, place];
  const numbers = numberPlaces(all);
  const no = numbers.get(place.id) ?? "";

  const row = place as unknown as Record<string, unknown>;
  const name = placeName(place, lang);
  const summary = pickText(row, "summary", lang);
  const howTo = pickText(row, "how_to_get", lang);
  const catLabel = CATEGORY_KEY[place.category] ? t(lang, CATEGORY_KEY[place.category]) : place.category;
  const amenities = place.amenities ?? [];
  const amenityMode = isAmenityCategory(place.category);
  const closed = place.status === "closed";
  const state = placeState(place, now);
  const todayText = todayHoursText(place.hours, now);
  const known = hasHours(place.hours);
  const todayIdx = seoulParts(now).weekday;
  // 사진은 참여 가게·해변·명소만 (공개 뷰도 비워 주지만 화면에서 한 번 더 막는다 — 규칙은 place-photos.ts)
  const photos = canShowPlacePhotos(place) ? (place.photos ?? []) : [];
  const [heroPhoto, ...morePhotos] = photos;
  // 0004 적용 전 뷰에는 phone 칸이 없다 → null 이면 전화 줄을 그리지 않는다
  const phone = placePhone(place);
  // 자체 사진이 없으면 분류 대표 사진 한 장 — 이 가게 사진이 아니므로 「분류 대표 사진」 표시. 그것도 없으면 색면
  const visual = PLACE_VISUAL[place.category] ?? FALLBACK_VISUAL;
  const hood = neighborhoodOf(place);
  const placesHref = `/${lang}/places`;

  const near = nearest(place, all, 3);
  const mapPlaces = toMapPlaces(all, numbers, lang);
  const drawable = inMap(place.lat, place.lng);
  const stamp = place.verified_at ? place.verified_at.slice(0, 10).replace(/-/g, ".") : null;

  return (
    <div className="mz-place">
      {/* ① 표지 */}
      <section className="cover ph-hero" aria-label={name.text}>
        <div className="cover-media">
          {heroPhoto ? (
            <SafeImage
              src={photoUrl(heroPhoto)}
              alt={tf(lang, "photoAlt", { name: name.text })}
              fallbackSrc={visual.photo}
              fallbackLabel={t(lang, "categoryPhotoLabel")}
            />
          ) : visual.photo ? (
            <div className="ph-img">
              <Image src={visual.photo} alt="" fill priority sizes="100vw" />
            </div>
          ) : (
            <span className={`noimg cat-${place.category}`} aria-hidden="true">
              <span className="glyph">{name.text.replace(/^양양\s*/, "").charAt(0)}</span>
            </span>
          )}
        </div>
        <div className="cover-in">
          <div className="cover-meta rise">
            <span className="crumb-w">
              <Link href={placesHref}>{t(lang, "placesTitle")}</Link>
              {" / "}
              <Link href={`${placesHref}${placesQueryString({ category: place.category })}`}>{catLabel}</Link>
            </span>
            <span className="label">{tf(lang, "placeIndexNo", { no })}</span>
            <span className="it">{hoodText(hood, lang).name}</span>
          </div>
          <div className="ph-title">
            <div>
              <span className="p-no rise">{tf(lang, "placeNoCat", { no, cat: catLabel })}</span>
              <h1 className={`rise d1 ${titleSize(name.text)}`}>{name.text}</h1>
              {name.sub ? <div className="roman rise d1">{name.sub}</div> : null}
            </div>
            <div className="ph-side rise d2">
              <p>{place.address_ko}</p>
              <span className={`st ${state}`}>
                <i aria-hidden="true" />
                {stateText(lang, state)}
                {state === "open" && todayText ? ` · ${todayText}` : null}
              </span>
            </div>
          </div>
          <div className="cover-foot">
            {!heroPhoto && visual.photo ? <span className="rep">{t(lang, "categoryPhotoLabel")}</span> : <span />}
            <div className="p-acts rise d3">
              <a className="btn-solid light" href="#info">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                {t(lang, "detailInfoTitle")}
              </a>
              <SaveButton kind="place" id={place.id} lang={lang} variant="text" className="btn-line light" />
            </div>
          </div>
        </div>
      </section>

      {/* ② 본문 + 입장권 */}
      <div className="wrap">
        <div className="p-body2">
          <article className="article">
            <span className="label kick">{t(lang, "placeAboutKicker")}</span>
            {summary.text ? (
              <h2>
                {summary.text}
                <FallbackNote lang={lang} show={summary.fallback} />
              </h2>
            ) : (
              <p className="empty-note">{t(lang, "placeNoIntro")}</p>
            )}

            {howTo.text ? (
              <section className="art-sec">
                <span className="label">{t(lang, "placeHowKicker")}</span>
                <h3>{t(lang, "howToGet")}</h3>
                <p className={howTo.text.length > 60 ? "lead" : undefined}>
                  {howTo.text}
                  <FallbackNote lang={lang} show={howTo.fallback} />
                </p>
              </section>
            ) : null}

            {morePhotos.length ? (
              <figure className={`art-fig ${morePhotos.length === 1 ? "one" : ""}`}>
                {morePhotos.slice(0, 2).map((p, i) => (
                  <div key={p} className={i === 0 ? "f1" : "f2"}>
                    <SafeImage src={photoUrl(p)} alt={tf(lang, "photoAlt", { name: name.text })} />
                  </div>
                ))}
              </figure>
            ) : null}

            {place.has_english_menu ? (
              <section className="art-sec">
                <span className="label">{t(lang, "placeMenuKicker")}</span>
                <p>{t(lang, "placeMenuBody")}</p>
                <Link className="btn-line" href={`/${lang}/m/${place.code}`}>
                  {t(lang, "viewEnglishMenu")}
                  <Arrow />
                </Link>
              </section>
            ) : null}
          </article>

          <aside className="pass" id="info" aria-labelledby="pass-title">
            <div className="pass-band">
              <span className="label">{t(lang, "passBand")}</span>
              <span className="it">No. {no}</span>
            </div>
            <div className="pass-main">
              <h2 id="pass-title">
                {name.text}
                {name.sub ? <small>{name.sub}</small> : null}
              </h2>
              {known && !closed ? (
                <ol className="week" aria-label={t(lang, "passWeekLabel")}>
                  {WEEK_MON_FIRST.map(({ key, index }) => {
                    const off = !(place.hours[key] ?? []).length;
                    const label = t(lang, WEEKDAY_KEYS[index]);
                    return (
                      <li
                        key={key}
                        className={`${index === todayIdx ? "today" : ""} ${off ? "off" : ""}`}
                        aria-label={`${label}${index === todayIdx ? ` (${t(lang, "today")})` : ""} · ${off ? t(lang, "dayOff") : (place.hours[key] ?? []).map(([o, c]) => `${o}–${c}`).join(", ")}`}
                      >
                        <span aria-hidden="true">{label}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
              <dl>
                <div>
                  <dt>{t(lang, "passNow")}</dt>
                  <dd>
                    <span className={`st ${state}`}>
                      <i aria-hidden="true" />
                      {stateText(lang, state)}
                    </span>
                    {!closed && known ? <small>{todayText ?? t(lang, "dayOff")}</small> : null}
                  </dd>
                </div>
                {known && !closed ? (
                  <div>
                    <dt>{t(lang, "hours")}</dt>
                    <dd>
                      <HoursTable hours={place.hours} lang={lang} now={now} />
                    </dd>
                  </div>
                ) : null}
                {amenityMode ? null : (
                  <div>
                    <dt>{t(lang, "priceLabel")}</dt>
                    <dd>
                      {priceSymbol(place.price_level)} · {t(lang, PRICE_KEY[place.price_level])}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t(lang, "parking")}</dt>
                  <dd>{yesNo(lang, place.parking)}</dd>
                </div>
                <div>
                  <dt>{t(lang, "foreignCard")}</dt>
                  <dd>{yesNo(lang, place.foreign_card)}</dd>
                </div>
                {amenities.some((a) => AMENITY_KEY[a]) ? (
                  <div>
                    <dt>{t(lang, "passAmenities")}</dt>
                    <dd>{amenities.filter((a) => AMENITY_KEY[a]).map((a) => t(lang, AMENITY_KEY[a])).join(" · ")}</dd>
                  </div>
                ) : null}
                {phone ? (
                  <div>
                    <dt>{t(lang, "phone")}</dt>
                    <dd>
                      <a className="tel" href={telHref(phone)}>
                        {phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t(lang, "address")}</dt>
                  <dd>{place.address_ko}</dd>
                </div>
              </dl>
              <MapLinks lat={place.lat} lng={place.lng} name={place.name_ko} lang={lang} variant="pass" />
            </div>
            <div className="pass-stub">
              <div>
                <b className={state === "open" ? "open" : ""}>{state === "none" ? catLabel : stateText(lang, state)}</b>
                <span>{!closed && known ? tf(lang, "passStubToday", { h: todayText ?? t(lang, "dayOff") }) : `No. ${no}`}</span>
              </div>
              {stamp ? (
                <span className="pass-stamp" aria-label={tf(lang, "passCheckedLabel", { date: formatVerifiedDate(place.verified_at, lang) })}>
                  <i aria-hidden="true">{t(lang, "passChecked")}</i>
                  <span aria-hidden="true">{stamp}</span>
                </span>
              ) : null}
            </div>
            <VerifiedLine method={place.verified_method} at={place.verified_at} by={place.verified_by_name} lang={lang} className="src" />
          </aside>
        </div>
      </div>

      {/* ③ 확대 약도 + 근처 세 곳 */}
      {near.length ? (
        <section className="p-map" aria-labelledby="near-title">
          <div className="wrap">
            <header className="sec-head">
              <span className="sec-no">{no}</span>
              <div>
                <span className="label">{t(lang, "placeNearKicker")}</span>
                <h2 id="near-title">{tf(lang, "placeNearTitle", { name: name.text, n: String(near.length) })}</h2>
              </div>
              <p>{tf(lang, "placeNearLead", { name: name.text })}</p>
            </header>
            <div className={`p-around ${drawable ? "" : "no-map"}`}>
              {drawable ? (
                <div className="p-mapcard">
                  <span className="tape" aria-hidden="true" />
                  <div className="sheet-h">
                    <p className="hand">{t(lang, "mapFocusHint")}</p>
                    <span className="it">
                      {place.lat.toFixed(4)} N · {place.lng.toFixed(4)} E
                    </span>
                  </div>
                  <SketchMap
                    places={mapPlaces}
                    lang={lang}
                    uid="place-map"
                    variant="focus"
                    focusId={place.id}
                    nearIds={near.map((n) => n.item.id)}
                  />
                </div>
              ) : null}
              <ol className="near3">
                {near.map(({ item: p, km }) => {
                  const nm = placeName(p, lang);
                  const sm = pickText(p as unknown as Record<string, unknown>, "summary", lang);
                  const s = placeState(p, now);
                  const cl = CATEGORY_KEY[p.category] ? t(lang, CATEGORY_KEY[p.category]) : p.category;
                  return (
                    <li key={p.id} data-row={p.id}>
                      <Link href={`/${lang}/place/${p.slug}`} className={`nc cat-${p.category}`}>
                        <span className="nc-d">
                          {formatDistance(km)}
                          <small>{t(lang, "straightLine")}</small>
                        </span>
                        <span className="nc-cat">
                          {numbers.get(p.id)} · {cl}
                        </span>
                        <b>{nm.text}</b>
                        {sm.text ? <p>{sm.text}</p> : null}
                        {s === "none" ? null : (
                          <span className="nc-st">
                            <i aria-hidden="true" />
                            {stateText(lang, s)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {/* ④ 이 장소가 나오는 이야기 (실제 연결된 것만) */}
      {stories.length ? (
        <section className="p-more" aria-labelledby="stories-title">
          <div className="wrap">
            <header className="sec-head">
              <span className="sec-no">04</span>
              <div>
                <span className="label">{t(lang, "placeStoriesKicker")}</span>
                <h2 id="stories-title">{t(lang, "placeStoriesTitle")}</h2>
              </div>
              <Link className="more" href={`/${lang}/stories`}>
                {t(lang, "storiesSeeAllShort")}
                <Arrow />
              </Link>
            </header>
            <div className={`p-stories ${stories.length === 1 ? "one" : ""}`}>
              {stories.slice(0, 3).map((s, i) => {
                const r = s as unknown as Record<string, unknown>;
                const title = pickText(r, "title", lang);
                const sum = pickText(r, "summary", lang);
                return (
                  <Link key={s.id} className={`story ${i === 0 ? "big" : ""}`} href={`/${lang}/stories/${s.slug}`}>
                    <div className="ph">
                      <StoryPhoto story={s} lang={lang} sizes={i === 0 ? "(min-width: 861px) 58vw, 100vw" : "(min-width: 861px) 40vw, 100vw"} />
                    </div>
                    <span className="label">{STORY_TYPE_KEY[s.type] ? t(lang, STORY_TYPE_KEY[s.type]) : s.type}</span>
                    <h4>
                      {title.text}
                      <FallbackNote lang={lang} show={title.fallback} />
                    </h4>
                    {sum.text ? <p>{sum.text}</p> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* ⑤ 이 장소의 놀거리 (실제 연결된 것만) */}
      {activities.length ? (
        <section className="p-more" aria-labelledby="acts-title">
          <div className="wrap">
            <header className="sec-head">
              <span className="sec-no">03</span>
              <div>
                <span className="label">{t(lang, "placeActivitiesKicker")}</span>
                <h2 id="acts-title">{t(lang, "placeActivitiesTitle")}</h2>
              </div>
              <Link className="more" href={`/${lang}/play`}>
                {t(lang, "playSeeAllShort")}
                <Arrow />
              </Link>
            </header>
            <div className="rel">
              {activities.map(({ activity: a, offSeason }) => {
                const r = a as unknown as Record<string, unknown>;
                const title = pickText(r, "title", lang);
                const desc = pickText(r, "desc", lang);
                const photo = PLAY_VISUAL[a.category]?.photo;
                const label = [PLAY_CATEGORY_KEY[a.category] ? t(lang, PLAY_CATEGORY_KEY[a.category]) : a.category, activityWhen(a, lang)]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Link key={a.id} href={`/${lang}/activity/${a.id}`} className={offSeason ? "is-off" : ""}>
                    <div className="rph">
                      {photo ? (
                        <>
                          <Image src={photo} alt="" fill sizes="200px" />
                          <span className="rep">{t(lang, "categoryPhotoLabel")}</span>
                        </>
                      ) : (
                        <span className={`noimg play-${a.category}`} aria-hidden="true">
                          <span className="glyph">{title.text.charAt(0)}</span>
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="label">{label}</span>
                      <h4>
                        {title.text}
                        <FallbackNote lang={lang} show={title.fallback} />
                      </h4>
                      {desc.text ? <p>{desc.text}</p> : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* ⑥ 팁 · 정보 수정 제보 (<section id="tips">) */}
      <div className="p-tips">
        <div className="wrap">
          <div className="p-tips-in">
            <TipList lang={lang} targetType="place" targetId={place.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
