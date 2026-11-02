import { describe, expect, it } from "vitest";
import { sampleOptions } from "../src/lib/samples";

const rows = [
  { id: "a", name_ko: "실가게", is_sample: false },
  { id: "b", name_ko: "샘플가게", is_sample: true },
  { id: "c", name_ko: "연결된샘플", is_sample: true },
];

describe("sampleOptions (연결할 가게 고르기)", () => {
  it("운영(샘플 숨김)에서는 샘플 가게를 뺀다", () => {
    expect(sampleOptions(rows, false)).toEqual([{ id: "a", name_ko: "실가게" }]);
  });
  it("미리보기(샘플 표시)에서는 이름 뒤에 (샘플)을 붙인다", () => {
    expect(sampleOptions(rows, true).map((r) => r.name_ko)).toEqual(["실가게", "샘플가게 (샘플)", "연결된샘플 (샘플)"]);
  });
  it("지금 연결된 샘플 가게는 운영에서도 (샘플) 표시로 남긴다", () => {
    expect(sampleOptions(rows, false, "c")).toEqual([
      { id: "a", name_ko: "실가게" },
      { id: "c", name_ko: "연결된샘플 (샘플)" },
    ]);
  });
});
