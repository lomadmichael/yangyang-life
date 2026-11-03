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
import { isAmenityCategory } from "@/components/PlaceCard";
import { SaveButton } from "@/components/SaveButton";
import { SafeImage } from "@/components/SafeImage";
import { TipList } from "@/components/TipList";
import { VerifiedLine } from "@/components/VerifiedLine";
import { isLang, pickText, t, tf, type DictKey, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import { isOpenNow } from "@/lib/hours";
import { AMENITY_KEY, CATEGORY_KEY, PRICE_KEY, STORY_TYPE_KEY, priceSymbol } from "@/lib/labels";
import { getPlaceBySlug, listActivities, listStoriesMentioning } from "@/lib/queries";
import type { Activity, Story, StoryType } from "@/lib/types";

/** 이야기 갈래 배지 색 (디자인 인계 2-5: 코스 salmon · 사람 pine · 가이드 sea) */
const STORY_TONE: Record<StoryType, "partner" | "open" | "info"> = { course: "partner", people: "open", guide: "info" };

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

export default async function PlacePage({ params }: PageProps<"/[lang]/place/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const [stories, activities] = await Promise.all([storiesFor(place.id), activitiesAt(place.id)]);
  const now = new Date();
  const categoryKey = CATEGORY_KEY[place.category];
  const amenities = place.amenities ?? [];
  const row = place as unknown as Record<string, unknown>;
  const name = pickText(row, "name", lang);
  const summary = pickText(row, "summary", lang);
  const howTo = pickText(row, "how_to_get", lang);
  const closed = place.status === "closed";
  const open = isOpenNow(place.hours, place.status, now);
  // 사진은 동의한 참여 가게만 (공개 뷰도 비워 주지만 화면에서 한 번 더 막는다)
  const photos = place.status === "participating" ? place.photos : [];

  return (
    <article className="flex flex-col gap-5 px-4 pb-10">
      <div className="flex items-center justify-between gap-3">
        <BackLink href={`/${lang}/places`} label={t(lang, "placesTitle")} />
        <SaveButton kind="place" id={place.id} lang={lang} size="md" />
      </div>

      {photos.length > 0 ? (
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 empty:hidden">
          {photos.map((p) => (
            <SafeImage
              key={p}
              src={photoUrl(p)}
              alt={tf(lang, "photoAlt", { name: name.text })}
              className="aspect-[4/3] w-[85%] shrink-0 snap-start rounded-2xl bg-sea-soft object-cover"
            />
          ))}
        </div>
      ) : null}

      <header className="flex flex-col gap-2">
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
        <h1 className="text-2xl font-bold leading-snug">
          {name.text}
          <FallbackNote lang={lang} show={name.fallback} />
        </h1>
        {lang === "en" && !name.fallback ? <p className="text-muted">{place.name_ko}</p> : null}
        {summary.text ? (
          <p>
            {summary.text}
            <FallbackNote lang={lang} show={summary.fallback} />
          </p>
        ) : null}
      </header>

      {place.has_english_menu ? (
        <Link
          href={`/${lang}/m/${place.code}`}
          className="flex min-h-12 items-center justify-center rounded-xl bg-salmon-strong px-4 font-bold text-on-sea"
        >
          {t(lang, "viewEnglishMenu")}
        </Link>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t(lang, "address")}</h2>
        <p>{place.address_ko}</p>
        <MapLinks lat={place.lat} lng={place.lng} name={place.name_ko} lang={lang} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t(lang, "hours")}</h2>
        {closed ? <p className="text-muted">{t(lang, "statusClosed")}</p> : <HoursTable hours={place.hours} lang={lang} now={now} />}
      </section>

      <dl className="rounded-2xl border border-line bg-surface px-4">
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

      {howTo.text ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">{t(lang, "howToGet")}</h2>
          <p>
            {howTo.text}
            <FallbackNote lang={lang} show={howTo.fallback} />
          </p>
        </section>
      ) : null}

      <VerifiedLine method={place.verified_method} at={place.verified_at} by={place.verified_by_name} lang={lang} />

      {stories.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{t(lang, "placeStoriesTitle")}</h2>
          <ul className="flex flex-col gap-2">
            {stories.map((s) => {
              const title = pickText(s as unknown as Record<string, unknown>, "title", lang);
              const by = [s.author_name, s.author_team].filter(Boolean).join(" · ");
              return (
                <li key={s.id}>
                  <Link
                    href={`/${lang}/stories/${s.slug}`}
                    className="flex min-h-11 flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3 active:bg-sea-soft"
                  >
                    <span>
                      <Badge tone={STORY_TONE[s.type] ?? "muted"}>
                        {STORY_TYPE_KEY[s.type] ? t(lang, STORY_TYPE_KEY[s.type]) : s.type}
                      </Badge>
                    </span>
                    <span className="font-bold leading-snug">
                      {title.text}
                      <FallbackNote lang={lang} show={title.fallback} />
                    </span>
                    {by ? <span className="text-sm text-muted">{tf(lang, "storyByline", { name: by })}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {activities.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{t(lang, "placeActivitiesTitle")}</h2>
          <ul className="flex flex-col gap-3">
            {activities.map((a) => (
              <li key={a.id}>
                <ActivityCard activity={a} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 팁: 「바뀌었어요·꿀팁·가는 법」 목록 + 쓰기 폼 (<section id="tips">) */}
      <TipList lang={lang} targetType="place" targetId={place.id} />
    </article>
  );
}
