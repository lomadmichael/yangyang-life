import { describe, expect, it } from "vitest";
import { isLang, pickText, resolveLang, t } from "../src/i18n";
import { en } from "../src/i18n/en";
import { ko } from "../src/i18n/ko";

describe("resolveLang", () => {
  it("returns ko when Accept-Language includes Korean", () => {
    expect(resolveLang("ko-KR,ko;q=0.9,en;q=0.8")).toBe("ko");
    expect(resolveLang("en-US,en;q=0.9,ko;q=0.5")).toBe("ko");
  });
  it("returns en otherwise", () => {
    expect(resolveLang("en-US,en;q=0.9")).toBe("en");
    expect(resolveLang("ja-JP")).toBe("en");
    expect(resolveLang("")).toBe("en");
    expect(resolveLang(null)).toBe("en");
  });
});

describe("isLang", () => {
  it("accepts only ko and en", () => {
    expect(isLang("ko")).toBe(true);
    expect(isLang("en")).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang("KO")).toBe(false);
  });
});

describe("pickText", () => {
  it("uses the requested language when present", () => {
    expect(pickText({ name_ko: "죽도식당", name_en: "Jukdo Diner" }, "name", "en")).toEqual({ text: "Jukdo Diner", fallback: false });
  });
  it("falls back to Korean when the English value is empty or missing", () => {
    expect(pickText({ name_ko: "죽도식당", name_en: "" }, "name", "en")).toEqual({ text: "죽도식당", fallback: true });
    expect(pickText({ name_ko: "죽도식당", name_en: null }, "name", "en")).toEqual({ text: "죽도식당", fallback: true });
    expect(pickText({ name_ko: "죽도식당", name_en: "   " }, "name", "en")).toEqual({ text: "죽도식당", fallback: true });
  });
  it("returns Korean without fallback flag for ko", () => {
    expect(pickText({ name_ko: "죽도식당" }, "name", "ko")).toEqual({ text: "죽도식당", fallback: false });
  });
});

describe("dictionary", () => {
  it("has the same keys in ko and en", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
  });
  it("translates the home buttons and footer", () => {
    expect(t("ko", "homeWhatToDo")).toBe("오늘 뭐하지?");
    expect(t("en", "homeWhatToDo")).toBe("What to do today?");
    expect(t("ko", "homeWhereToEat")).toBe("오늘 뭐 먹지?");
    expect(t("en", "homeWhereToEat")).toBe("Where to eat tonight?");
    expect(t("ko", "footerSupport")).toBe("양양군농업기술센터 지원");
    expect(t("en", "footerSupport")).toBe("Supported by Yangyang Agricultural Technology Center");
    expect(t("ko", "siteName")).toBe("양양생활");
    expect(t("en", "siteName")).toBe("YANGYANG LIFE");
  });
});
