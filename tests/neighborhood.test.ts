import { describe, expect, it } from "vitest";
import { groupByNeighborhood, neighborhoodOf, numberPlaces } from "../src/lib/neighborhood";
import { featureCount, featureScore, placeName, placeState, todayHoursText } from "../src/lib/place-view";

// 디자인 명세(yangyang-design/out/v3/d/data.js)의 실제 좌표 30곳과 그 묶음(7 / 12 / 2 / 9)
const SAMPLE: [string, number, number, string][] = [
  ["pameoseu-kichin", 37.98039, 128.76216, "dongsan"],
  ["dongsanpo-haesuyokjang", 37.97813, 128.75953, "dongsan"],
  ["seopeuneori", 37.97274, 128.75923, "dongsan"],
  ["jukdo-haesuyokjang", 37.9723, 128.75956, "dongsan"],
  ["gim-taekjun-gaok", 37.97183, 128.75926, "dongsan"],
  ["reuonda", 37.97163, 128.7608, "dongsan"],
  ["jukdojeong-jukdo-jeonmangdae", 37.97161, 128.76351, "dongsan"],
  ["beurideu-hotel-yangyang", 37.97094, 128.7621, "ingu"],
  ["ingu-hang", 37.97052, 128.7636, "ingu"],
  ["ingu-haesuyokjang", 37.97026, 128.76192, "ingu"],
  ["eongkeul-seopeu-yangyang", 37.97024, 128.76121, "ingu"],
  ["yangyang-dudungsil", 37.9697, 128.75804, "ingu"],
  ["seopeu-woldeu", 37.96923, 128.76141, "ingu"],
  ["hyeonnam-myeon-haengjeong-bokji-senteo", 37.96922, 128.75949, "ingu"],
  ["hyeonnam-myeon-bogeon-jiso", 37.96892, 128.76101, "ingu"],
  ["peullijeu-weit", 37.96859, 128.76194, "ingu"],
  ["ingu-seopeu", 37.96859, 128.76174, "ingu"],
  ["yangyang-memil-raunji", 37.96752, 128.76136, "ingu"],
  ["mejong-deu-mereu", 37.96589, 128.76202, "ingu"],
  ["hyuhyuam", 37.96122, 128.76745, "hyuhyu"],
  ["namae-haebyeon", 37.95368, 128.76952, "hyuhyu"],
  ["gangwon-hoetjip", 37.94506, 128.78686, "namae"],
  ["namae-jeil-sikdang", 37.94492, 128.78713, "namae"],
  ["eomin-hugyeja-hoetjip", 37.94484, 128.78708, "namae"],
  ["gaenmaeul-haebyeon", 37.94479, 128.78542, "namae"],
  ["namae-hang", 37.94449, 128.78741, "namae"],
  ["yangpa-daibeu", 37.94387, 128.7853, "namae"],
  ["deo-aen-rijoteu", 37.94354, 128.77037, "namae"],
  ["namae-seukubeo-rijoteu", 37.94151, 128.78741, "namae"],
  ["pogun", 37.93392, 128.78925, "namae"],
];

describe("neighborhoodOf", () => {
  it("시안의 30곳 묶음과 같다", () => {
    for (const [slug, lat, lng, hood] of SAMPLE) expect(neighborhoodOf({ lat, lng }), slug).toBe(hood);
  });

  it("묶음 크기 7 / 12 / 2 / 9", () => {
    const groups = groupByNeighborhood(SAMPLE.map(([, lat, lng]) => ({ lat, lng })));
    expect(groups.map((g) => [g.hood, g.items.length])).toEqual([
      ["dongsan", 7],
      ["ingu", 12],
      ["hyuhyu", 2],
      ["namae", 9],
    ]);
  });

  it("현남면 밖·판정 불가 좌표는 그 밖", () => {
    expect(neighborhoodOf({ lat: 38.07, lng: 128.62 })).toBe("other"); // 양양읍 쪽
    expect(neighborhoodOf({ lat: 37.9, lng: 128.8 })).toBe("other");
    expect(neighborhoodOf({ lat: Number.NaN, lng: 128.76 })).toBe("other");
    expect(neighborhoodOf({ lat: null, lng: undefined })).toBe("other");
  });

  it("그 밖은 맨 뒤 묶음", () => {
    const groups = groupByNeighborhood([
      { lat: 0, lng: 0 },
      { lat: 37.96122, lng: 128.76745 },
    ]);
    expect(groups.map((g) => g.hood)).toEqual(["hyuhyu", "other"]);
  });
});

describe("numberPlaces", () => {
  it("북쪽부터 01, 같은 위도는 이름 순", () => {
    const m = numberPlaces([
      { id: "s", lat: 37.94, name_ko: "남" },
      { id: "n", lat: 37.98, name_ko: "북" },
      { id: "b", lat: 37.96, name_ko: "나" },
      { id: "a", lat: 37.96, name_ko: "가" },
    ]);
    expect([m.get("n"), m.get("a"), m.get("b"), m.get("s")]).toEqual(["01", "02", "03", "04"]);
  });
});

describe("placeName", () => {
  const p = { name_ko: "휴휴암", name_en: null, name_roman: "Hyuhyuam" };
  it("국문은 한글 이름 + 로마자", () => {
    expect(placeName(p, "ko")).toEqual({ text: "휴휴암", fallback: false, sub: "Hyuhyuam" });
  });
  it("영문은 name_en → name_roman → name_ko(대신 표시)", () => {
    expect(placeName({ ...p, name_en: "Hyuhyu Temple" }, "en").text).toBe("Hyuhyu Temple");
    expect(placeName(p, "en")).toEqual({ text: "Hyuhyuam", fallback: false, sub: "휴휴암" });
    expect(placeName({ ...p, name_roman: " " }, "en")).toEqual({ text: "휴휴암", fallback: true, sub: null });
  });
});

describe("placeState · todayHoursText", () => {
  // 2026-11-25 은 수요일 — 서울 10:30 = UTC 01:30
  const wed1030 = new Date("2026-11-25T01:30:00Z");
  const hours = { wed: [["09:00", "18:00"]] as [string, string][] };
  it("영업 중 / 닫힘 / 휴업 / 정보 없음", () => {
    expect(placeState({ hours, status: "listed" }, wed1030)).toBe("open");
    expect(placeState({ hours: { thu: [["09:00", "18:00"]] }, status: "listed" }, wed1030)).toBe("later");
    expect(placeState({ hours, status: "closed" }, wed1030)).toBe("shut");
    expect(placeState({ hours: {}, status: "listed" }, wed1030)).toBe("none");
  });
  it("오늘 구간 글자", () => {
    expect(todayHoursText(hours, wed1030)).toBe("09:00–18:00");
    expect(todayHoursText({}, wed1030)).toBeNull();
  });
});

describe("대표 카드", () => {
  it("자체 사진이 가장 먼저", () => {
    expect(featureScore({ ownPhoto: true, participating: false, open: false })).toBeGreaterThan(
      featureScore({ ownPhoto: false, participating: true, open: true }),
    );
  });
  it("동네 크기에 따라 1~3장", () => {
    expect([1, 2, 4, 5, 12].map(featureCount)).toEqual([1, 2, 2, 3, 3]);
  });
});
