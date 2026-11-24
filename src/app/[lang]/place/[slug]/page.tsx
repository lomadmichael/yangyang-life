import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ActivityCard } from "@/components/ActivityCard";
import { BackLink } from "@/components/BackLink";
import { Badge } from "@/components/Badge";
import { FallbackNote } from "@/components/FallbackNote";
import { HoursTable } from "@/components/HoursTable";
import { InfoRow } from "@/components/InfoRow";
import { MapLinks } from "@/components/MapLinks";
import { FALLBACK_VISUAL, PLACE_VISUAL } from "@/components/category-visual";
import { PhotoFrame } from "@/components/PhotoCard";
import { isAmenityCategory } from "@/components/PlaceCard";
import { SaveButton } from "@/components/SaveButton";
import { SafeImage } from "@/components/SafeImage";
import { StoryCard } from "@/components/StoryCard";
import { TipList } from "@/components/TipList";
import { VerifiedLine } from "@/components/VerifiedLine";
import { isLang, pickText, t, tf, type DictKey, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import { isOpenNow } from "@/lib/hours";
import { canShowPlacePhotos, placePhone, telHref } from "@/lib/place-photos";
import { placeActivities } from "@/lib/play";
import { AMENITY_KEY, CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import { getPlaceBySlug, listActivities, listStoriesMentioning } from "@/lib/queries";
import type { Activity, Story } from "@/lib/types";

// 아래 두 묶음은 곁가지 — 조회가 실패해도(예: 0003 적용 전 stories_public 없음) 상세 화면은 그대로 보여 준다
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

function yesNo(lang: Lang, v: boolean | null): string {
  const key: DictKey = v === null ? "unknown" : v ? "yes" : "no";
  return t(lang, key);
}

/**
 * PC(lg) 사진 모자이크 칸 — 첫 장은 왼쪽 2칸×2줄, 둘째·셋째는 오른쪽 위·아래(둘뿐이면 둘째가 오른쪽 통째).
 * 넷째부터는 PC 에서 숨긴다(모바일 가로 넘김에는 전부 나온다).
 * 한 장뿐이면 사진 자체를 5:2 로, 여러 장이면 틀(5:2)을 칸이 꽉 채운다.
 */
function galleryCell(i: number, n: number): string {
  if (n === 1) return "lg:aspect-[5/2]";
  const fill = "lg:aspect-auto lg:h-full";
  if (i === 0) return `${fill} lg:col-span-2 lg:row-span-2`;
  if (i === 1 && n === 2) return `${fill} lg:row-span-2`;
  return i >= 3 ? "lg:hidden" : fill;
}

export default async function PlacePage({ params }: PageProps<"/[lang]/place/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const [stories, activitiesHere] = await Promise.all([storiesFor(place.id), activitiesAt(place.id)]);
  const now = new Date();
  // 끝난 기간 행사는 빼고, 비시즌(서울 이번 달 기준)은 뒤로 보내 흐리게
  const activities = placeActivities(activitiesHere, now);
  const categoryKey = CATEGORY_KEY[place.category];
  const amenities = place.amenities ?? [];
  const row = place as unknown as Record<string, unknown>;
  const name = pickText(row, "name", lang);
  const summary = pickText(row, "summary", lang);
  const howTo = pickText(row, "how_to_get", lang);
  const closed = place.status === "closed";
  const open = isOpenNow(place.hours, place.status, now);
  // 사진은 참여 가게·해변·명소만 (공개 뷰도 비워 주지만 화면에서 한 번 더 막는다 — 규칙은 place-photos.ts)
  const photos = canShowPlacePhotos(place) ? (place.photos ?? []) : [];
  // 0004 적용 전 뷰에는 phone 칸이 없다 → null 이면 전화 줄을 그리지 않는다
  const phone = placePhone(place);
  // 자체 사진이 없으면 분류 대표 사진 한 장 — 이 가게 사진이 아니므로 구석에 「분류 대표 사진」 표시
  const visual = PLACE_VISUAL[place.category] ?? FALLBACK_VISUAL;

  return (
    <article className="flex flex-col gap-5 px-4 pb-10 lg:gap-8 lg:px-8 lg:pb-16 lg:pt-6">
      <div className="flex items-center justify-between gap-3">
        <BackLink href={`/${lang}/places`} label={t(lang, "placesTitle")} />
        <SaveButton kind="place" id={place.id} lang={lang} size="md" />
      </div>

      {photos.length > 0 ? (
        <div
          className={`-mx-4 flex snap-x gap-2 overflow-x-auto px-4 empty:hidden lg:mx-0 lg:grid lg:gap-3 lg:overflow-visible lg:px-0 ${
            photos.length > 1 ? "lg:aspect-[5/2] lg:grid-cols-3 lg:grid-rows-2" : ""
          }`}
        >
          {photos.map((p, i) => (
            <SafeImage
              key={p}
              src={photoUrl(p)}
              alt={tf(lang, "photoAlt", { name: name.text })}
              className={`aspect-[4/3] w-[85%] shrink-0 snap-start rounded-2xl bg-sea-soft object-cover lg:w-full ${galleryCell(i, photos.length)}`}
            />
          ))}
        </div>
      ) : visual.photo ? (
        <PhotoFrame
          fallback={visual.photo}
          fallbackLabel={t(lang, "categoryPhotoLabel")}
          alt=""
          Icon={visual.Icon}
          tone={visual.tone}
          sizes="(min-width: 1024px) 1152px, 100vw"
          className="aspect-video rounded-2xl lg:aspect-[5/2]"
        />
      ) : null}

      {/* 모바일은 한 줄로 차례대로, PC(lg)는 왼쪽 2칸 본문 + 오른쪽 1칸 이용 정보 카드. 글 순서(DOM)는 모바일 순서 그대로 */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-8">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <header className="flex flex-col gap-2 lg:gap-3">
            <div className="flex flex-wrap gap-1.5">
              {categoryKey ? <Badge tone="muted">{t(lang, categoryKey)}</Badge> : null}
              {closed ? (
                <Badge tone="closed">{t(lang, "statusClosed")}</Badge>
              ) : open ? (
                <Badge tone="open">{t(lang, "openNow")}</Badge>
              ) : (
                <Badge tone="muted">{t(lang, "closedNow")}</Badge>
              )}
              {place.status === "participating" ? <Badge tone="partner">{t(lang, "badgePartner")}</Badge> : null}
            </div>
            <h1 className="text-2xl font-bold leading-snug lg:text-4xl">
              {name.text}
              <FallbackNote lang={lang} show={name.fallback} />
            </h1>
            {lang === "en" && !name.fallback ? <p className="text-muted lg:text-lg">{place.name_ko}</p> : null}
            {summary.text ? (
              <p className="lg:text-lg">
                {summary.text}
                <FallbackNote lang={lang} show={summary.fallback} />
              </p>
            ) : null}
          </header>

          {place.has_english_menu ? (
            <Link
              href={`/${lang}/m/${place.code}`}
              className="flex min-h-12 items-center justify-center rounded-xl bg-salmon-strong px-4 font-bold text-on-sea lg:self-start lg:px-8"
            >
              {t(lang, "viewEnglishMenu")}
            </Link>
          ) : null}
        </div>

        <aside
          aria-label={t(lang, "detailInfoTitle")}
          className="flex flex-col gap-5 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-6"
        >
          <h2 className="hidden text-lg font-bold lg:block">{t(lang, "detailInfoTitle")}</h2>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold">{t(lang, "address")}</h2>
            <p>{place.address_ko}</p>
            <MapLinks lat={place.lat} lng={place.lng} name={place.name_ko} lang={lang} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold">{t(lang, "hours")}</h2>
            {closed ? <p className="text-muted">{t(lang, "statusClosed")}</p> : <HoursTable hours={place.hours} lang={lang} now={now} />}
          </section>

          <dl className="rounded-2xl border border-line bg-surface px-4 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:px-0">
            {phone ? (
              <InfoRow label={t(lang, "phone")}>
                <a
                  href={telHref(phone)}
                  className="-my-3 inline-flex min-h-11 items-center font-medium text-sea underline underline-offset-4"
                >
                  {phone}
                </a>
              </InfoRow>
            ) : null}
            {isAmenityCategory(place.category) ? null : (
              <InfoRow label={t(lang, "priceLabel")}>
                {priceSymbol(place.price_level)} · {t(lang, PRICE_KEY[place.price_level])}
              </InfoRow>
            )}
            <InfoRow label={t(lang, "parking")}>{yesNo(lang, place.parking)}</InfoRow>
            <InfoRow label={t(lang, "foreignCard")}>{yesNo(lang, place.foreign_card)}</InfoRow>
            {amenities.map((a) =>
              AMENITY_KEY[a] ? (
                <InfoRow key={a} label={t(lang, AMENITY_KEY[a])}>
                  {t(lang, "yes")}
                </InfoRow>
              ) : null,
            )}
          </dl>

          <VerifiedLine
            method={place.verified_method}
            at={place.verified_at}
            by={place.verified_by_name}
            lang={lang}
            className="hidden lg:block"
          />
        </aside>

        <div className="flex flex-col gap-5 lg:col-span-2 lg:gap-8">
          {howTo.text ? (
            <section className="flex flex-col gap-2">
              <h2 className="font-bold lg:text-lg">{t(lang, "howToGet")}</h2>
              <p>
                {howTo.text}
                <FallbackNote lang={lang} show={howTo.fallback} />
              </p>
            </section>
          ) : null}

          <VerifiedLine
            method={place.verified_method}
            at={place.verified_at}
            by={place.verified_by_name}
            lang={lang}
            className="lg:hidden"
          />

          {stories.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-bold lg:text-lg">{t(lang, "placeStoriesTitle")}</h2>
              <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-4">
                {stories.map((s) => (
                  <li key={s.id}>
                    <StoryCard story={s} lang={lang} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {activities.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-bold lg:text-lg">{t(lang, "placeActivitiesTitle")}</h2>
              <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                {activities.map(({ activity: a, offSeason }) => (
                  <li key={a.id}>
                    <ActivityCard activity={a} lang={lang} dimmed={offSeason} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* 팁: 「바뀌었어요·꿀팁·가는 법」 목록 + 쓰기 폼 (<section id="tips">) */}
          <TipList lang={lang} targetType="place" targetId={place.id} />
        </div>
      </div>
    </article>
  );
}
