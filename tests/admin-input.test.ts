import { describe, expect, it } from "vitest";
import {
  ALLERGEN_CODES,
  formatRange,
  parseActivityInput,
  parseHours,
  parseMenuInput,
  parsePlaceInput,
  parseStoryInput,
  suggestSlug,
} from "../src/lib/admin-input";

const basePlace = {
  slug: "sample-noodle",
  category: "food",
  status: "listed",
  name_ko: "막국수집",
  name_en: "",
  name_roman: "",
  summary_ko: "",
  summary_en: "",
  address_ko: "양양군 현남면 1",
  lat: "37.97",
  lng: "128.76",
  hours: {},
  price_level: "2",
  parking: "unknown",
  foreign_card: "yes",
  how_to_get_ko: "",
  how_to_get_en: "",
};
const validPlace = basePlace;

describe("parseHours", () => {
  it("keeps several ranges per day and allows past-midnight (end ≤ start)", () => {
    const r = parseHours({ fri: [["18:00", "02:00"], ["11:00", "14:00"]], mon: [] });
    expect(r).toEqual({ ok: true, value: { fri: [["11:00", "14:00"], ["18:00", "02:00"]] } });
  });
  it("rejects bad times and unknown days", () => {
    expect(parseHours({ fri: [["25:00", "02:00"]] }).ok).toBe(false);
    expect(parseHours({ fri: [["9:00", "12:00"]] }).ok).toBe(false);
    expect(parseHours({ funday: [["09:00", "12:00"]] }).ok).toBe(false);
    expect(parseHours([]).ok).toBe(false);
  });
  it("formats ranges, with 「다음 날 HH:MM까지」 for past midnight", () => {
    expect(formatRange(["11:00", "20:00"])).toBe("11:00 ~ 20:00");
    expect(formatRange(["18:00", "02:00"])).toBe("18:00 ~ 다음 날 02:00까지");
  });
});

describe("parsePlaceInput", () => {
  it("builds a DB row", () => {
    const r = parsePlaceInput(basePlace);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      slug: "sample-noodle",
      category: "food",
      name_ko: "막국수집",
      name_en: null,
      lat: 37.97,
      lng: 128.76,
      price_level: 2,
      parking: null,
      foreign_card: true,
      hours: {},
    });
  });
  it("rejects a non kebab-case slug, missing name, bad coordinates", () => {
    expect(parsePlaceInput({ ...basePlace, slug: "Noodle House" }).ok).toBe(false);
    expect(parsePlaceInput({ ...basePlace, slug: "막국수" }).ok).toBe(false);
    expect(parsePlaceInput({ ...basePlace, name_ko: " " }).ok).toBe(false);
    expect(parsePlaceInput({ ...basePlace, lat: "abc" }).ok).toBe(false);
    expect(parsePlaceInput({ ...basePlace, lng: "500" }).ok).toBe(false);
    expect(parsePlaceInput({ ...basePlace, category: "pub" }).ok).toBe(false);
  });
  it("편의는 toilet/shower 만", () => {
    expect(parsePlaceInput({ ...validPlace, category: "spot", amenities: ["toilet", "wifi"] }).ok).toBe(false);
    const r = parsePlaceInput({ ...validPlace, category: "spot", amenities: ["shower", "toilet", "toilet"] });
    expect(r.ok && r.value.amenities).toEqual(["toilet", "shower"]);
    const none = parsePlaceInput(validPlace);
    expect(none.ok && none.value.amenities).toEqual([]);
  });
  it("never accepts code / created_by / verified_* from the client", () => {
    const r = parsePlaceInput({ ...basePlace, code: "zzzzzz", created_by: "x", verified_by: "y", is_sample: true });
    expect(r.ok && Object.keys(r.value)).not.toContain("code");
    if (r.ok) {
      expect(r.value).not.toHaveProperty("created_by");
      expect(r.value).not.toHaveProperty("verified_by");
      expect(r.value).not.toHaveProperty("is_sample");
    }
  });
});

describe("suggestSlug", () => {
  it("makes ASCII kebab-case", () => {
    expect(suggestSlug("Saempeul Makguksu-jip!")).toBe("saempeul-makguksu-jip");
    expect(suggestSlug("막국수")).toBe("");
  });
});

describe("parseMenuInput", () => {
  it("orders rows, keeps known allergens only, validates price/spicy", () => {
    const r = parseMenuInput([
      { name_ko: "물막국수", price: "10000", allergens: ["buckwheat", "nope"], vegan: false, spicy: 1 },
      { id: "11111111-1111-4111-8111-111111111111", name_ko: "수육", price: "", allergens: [], vegan: false, spicy: 0 },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]).toMatchObject({ sort: 0, name_ko: "물막국수", price: 10000, allergens: ["buckwheat"], spicy: 1 });
    expect(r.value[1]).toMatchObject({ sort: 1, id: "11111111-1111-4111-8111-111111111111", price: null });
    expect(ALLERGEN_CODES).toContain("buckwheat");
  });
  it("rejects empty names, negative prices, spicy out of range", () => {
    expect(parseMenuInput([{ name_ko: "" }]).ok).toBe(false);
    expect(parseMenuInput([{ name_ko: "a", price: "-1" }]).ok).toBe(false);
    expect(parseMenuInput([{ name_ko: "a", spicy: 5 }]).ok).toBe(false);
  });
});

describe("parseActivityInput", () => {
  const base = { kind: "always", category: "yoga", title_ko: "해변 요가", weekdays: [6, 0], rainy_ok: false, link: "" };
  const valid = base;
  it("accepts an always-type activity", () => {
    const r = parseActivityInput(base);
    expect(r.ok && r.value).toMatchObject({ kind: "always", title_ko: "해변 요가", weekdays: [0, 6], starts_on: null });
  });
  it("dated needs a start date and end ≥ start", () => {
    expect(parseActivityInput({ ...base, kind: "dated" }).ok).toBe(false);
    expect(parseActivityInput({ ...base, kind: "dated", starts_on: "2026-11-20", ends_on: "2026-11-19" }).ok).toBe(false);
    expect(parseActivityInput({ ...base, kind: "dated", starts_on: "2026-11-20", ends_on: "2026-11-22" }).ok).toBe(true);
  });
  it("link must be http(s)", () => {
    expect(parseActivityInput({ ...base, link: "javascript:alert(1)" }).ok).toBe(false);
    expect(parseActivityInput({ ...base, link: "https://example.com" }).ok).toBe(true);
  });
  it("놀거리 분류 필수·계절 1~12", () => {
    expect(parseActivityInput({ ...valid, category: undefined }).ok).toBe(false);
    expect(parseActivityInput({ ...valid, category: "village", season_months: [13] }).ok).toBe(false);
    const r = parseActivityInput({ ...valid, category: "surf", season_months: [10, 4, 4] });
    expect(r.ok && r.value.season_months).toEqual([4, 10]);
    const all = parseActivityInput(valid);
    expect(all.ok && all.value).toMatchObject({ category: "yoga", season_months: [] });
  });
});

// ── 이야기 입력 (Task 10) ─────────────────────────────

const STOP_PLACE = "11111111-1111-4111-8111-111111111111";

const validStory = {
  type: "course",
  guide_topic: null,
  slug: "rainy-day-hyeonnam",
  title_ko: "비 오는 날 현남 하루",
  title_en: "",
  summary_ko: "차 없이 걸어서",
  summary_en: "",
  cover_photo: "",
  visited_on: "2026-11-07",
  tags: ["rainy", "nocar"],
  blocks: [
    { key: "b1", t: "text", ko: "아침에 바다를 걸었어요.", en: "" },
    { key: "b2", t: "stop", place_id: STOP_PLACE, activity_id: "", time_ko: "10:00", time_en: "", note_ko: "", note_en: "" },
  ],
  // 아래는 클라이언트가 보내도 무시돼야 하는 칸
  author_id: "99999999-9999-4999-8999-999999999999",
  status: "published",
  is_sample: true,
  published_at: "2026-01-01T00:00:00Z",
  verified_at: "2026-01-01T00:00:00Z",
  review_note: "몰래",
};

const SB = "https://proj.supabase.co";

describe("parseStoryInput", () => {
  it("가이드는 주제 필수 (plan)", () => {
    expect(parseStoryInput({ ...validStory, type: "guide", guide_topic: null }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, type: "course", guide_topic: "surf" }, SB).ok).toBe(false);
  });

  it("정상 입력 → 정돈된 행. 작성자·상태·샘플·공개일·메모는 받지 않는다", () => {
    const r = parseStoryInput(validStory, SB);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      type: "course",
      guide_topic: null,
      slug: "rainy-day-hyeonnam",
      title_ko: "비 오는 날 현남 하루",
      title_en: null,
      summary_ko: "차 없이 걸어서",
      summary_en: null,
      cover_photo: null,
      visited_on: "2026-11-07",
      tags: ["nocar", "rainy"],
      blocks: [
        { t: "text", ko: "아침에 바다를 걸었어요.", en: null },
        { t: "stop", place_id: STOP_PLACE, activity_id: null, time_ko: "10:00", time_en: null, note_ko: null, note_en: null },
      ],
    });
    for (const k of ["author_id", "status", "is_sample", "published_at", "verified_at", "review_note"]) {
      expect(Object.prototype.hasOwnProperty.call(r.value, k)).toBe(false);
    }
  });

  it("가이드 주제는 놀거리·장소 분류 키만", () => {
    const g = parseStoryInput({ ...validStory, type: "guide", guide_topic: "surf" }, SB);
    expect(g.ok && g.value.guide_topic).toBe("surf");
    expect(parseStoryInput({ ...validStory, type: "guide", guide_topic: "spot" }, SB).ok).toBe(true);
    expect(parseStoryInput({ ...validStory, type: "guide", guide_topic: "casino" }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, type: "news" }, SB).ok).toBe(false);
  });

  it("제목 1~80자, 요약 140자까지", () => {
    expect(parseStoryInput({ ...validStory, title_ko: "  " }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, title_ko: "가".repeat(80) }, SB).ok).toBe(true);
    expect(parseStoryInput({ ...validStory, title_ko: "가".repeat(81) }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, title_en: "a".repeat(81) }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, summary_ko: "가".repeat(140) }, SB).ok).toBe(true);
    expect(parseStoryInput({ ...validStory, summary_ko: "가".repeat(141) }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, summary_en: "a".repeat(141) }, SB).ok).toBe(false);
  });

  it("slug: 장소와 같은 규칙. 비우면 영문 제목에서 제안, 그것도 없으면 null(서버가 채움)", () => {
    expect(parseStoryInput({ ...validStory, slug: "Bad Slug" }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, slug: "a".repeat(61) }, SB).ok).toBe(false);
    const fromEn = parseStoryInput({ ...validStory, slug: "", title_en: "A Rainy Day in Hyeonnam" }, SB);
    expect(fromEn.ok && fromEn.value.slug).toBe("a-rainy-day-in-hyeonnam");
    const none = parseStoryInput({ ...validStory, slug: "" }, SB);
    expect(none.ok && none.value.slug).toBe(null);
  });

  it("태그는 5종만, 다녀온 날은 실제 날짜, 대표 사진은 우리 Storage 주소만", () => {
    expect(parseStoryInput({ ...validStory, tags: ["solo", "vip"] }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, tags: "solo" }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, visited_on: "2026-02-30" }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, visited_on: "" }, SB).ok).toBe(true);
    expect(parseStoryInput({ ...validStory, cover_photo: "http://x.test/a.jpg" }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, cover_photo: "javascript:alert(1)" }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, cover_photo: "https://x.test/a.jpg" }, SB).ok).toBe(false);
    const cover = `${SB}/storage/v1/object/public/place-photos/stories/s1/c.jpg`;
    const c = parseStoryInput({ ...validStory, cover_photo: ` ${cover} ` }, SB);
    expect(c.ok && c.value.cover_photo).toBe(cover);
    expect(parseStoryInput({ ...validStory, cover_photo: cover }, "").ok).toBe(false);
  });

  it("본문은 parseStoryBlocks 규칙 그대로", () => {
    expect(parseStoryInput({ ...validStory, blocks: [{ t: "stop", place_id: STOP_PLACE, activity_id: STOP_PLACE }] }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, blocks: [{ t: "photo", url: "" }] }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, blocks: "x" }, SB).ok).toBe(false);
    expect(parseStoryInput({ ...validStory, blocks: [] }, SB).ok).toBe(true);
  });
});
