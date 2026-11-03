import { describe, expect, it } from "vitest";
import {
  ALLERGEN_CODES,
  formatRange,
  parseActivityInput,
  parseHours,
  parseMenuInput,
  parsePlaceInput,
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
