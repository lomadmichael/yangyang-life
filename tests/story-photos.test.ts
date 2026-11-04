import { describe, expect, it } from "vitest";
import {
  ORPHAN_GRACE_MS,
  isAllowedPhotoUrl,
  orphanStoryPhotos,
  photoPathFromUrl,
  realPhotoObjects,
  storagePublicPrefix,
  storyPhotoUrls,
  usesOtherStoryPhoto,
} from "../src/lib/story-photos";

const SB = "https://proj.supabase.co";
const PUB = `${SB}/storage/v1/object/public/`;
const ID = "11111111-1111-4111-8111-111111111111";
const url = (name: string) => `${PUB}place-photos/stories/${ID}/${name}`;

describe("isAllowedPhotoUrl", () => {
  it("우리 Storage 공개 주소만 통과", () => {
    expect(isAllowedPhotoUrl(url("a.jpg"), SB)).toBe(true);
    expect(isAllowedPhotoUrl(url("a.jpg"), `${SB}/`)).toBe(true);
    expect(isAllowedPhotoUrl("https://example.com/a.jpg", SB)).toBe(false);
    expect(isAllowedPhotoUrl("https://proj.supabase.co.evil.test/storage/v1/object/public/a.jpg", SB)).toBe(false);
    expect(isAllowedPhotoUrl(`${SB}/storage/v1/object/sign/place-photos/a.jpg`, SB)).toBe(false);
    expect(isAllowedPhotoUrl(PUB, SB)).toBe(false);
  });
  it("정규화로 빠져나가는 주소·이상한 값 거절", () => {
    expect(isAllowedPhotoUrl(`${PUB}../../rest/v1/x`, SB)).toBe(false);
    expect(isAllowedPhotoUrl(`${PUB}%2e%2e/%2e%2e/x`, SB)).toBe(false);
    expect(isAllowedPhotoUrl(`${PUB}a b.jpg`, SB)).toBe(false);
    expect(isAllowedPhotoUrl(`${PUB}${"a".repeat(2000)}`, SB)).toBe(false);
    expect(isAllowedPhotoUrl(null, SB)).toBe(false);
  });
  it("기준 주소가 없거나 https 가 아니면 전부 거절", () => {
    expect(isAllowedPhotoUrl(url("a.jpg"), "")).toBe(false);
    expect(isAllowedPhotoUrl(url("a.jpg"), undefined)).toBe(false);
    expect(storagePublicPrefix("http://proj.supabase.co")).toBeNull();
    expect(storagePublicPrefix(" https://proj.supabase.co/ ")).toBe(PUB);
  });
});

describe("이야기 사진 정리", () => {
  const now = new Date("2026-11-14T03:00:00Z");
  const old = new Date(now.getTime() - ORPHAN_GRACE_MS - 1000).toISOString();
  const fresh = new Date(now.getTime() - 60 * 1000).toISOString();
  const obj = (name: string, created_at: string | null = old, id: string | null = "x") => ({ name, id, created_at });

  it("주소 → 버킷 안 경로", () => {
    expect(photoPathFromUrl(url("a.jpg"), SB)).toBe(`stories/${ID}/a.jpg`);
    expect(photoPathFromUrl(`${url("a.jpg")}?v=2`, SB)).toBe(`stories/${ID}/a.jpg`);
    expect(photoPathFromUrl("https://example.com/a.jpg", SB)).toBeNull();
    expect(photoPathFromUrl(url("a.jpg"), "")).toBeNull();
  });

  it("대표 사진 + 사진 블록 주소 모으기", () => {
    expect(
      storyPhotoUrls({
        cover_photo: url("c.jpg"),
        blocks: [{ t: "text" }, { t: "photo", url: url("p.jpg") }, { t: "photo", url: "" }],
      }),
    ).toEqual([url("c.jpg"), url("p.jpg")]);
    expect(storyPhotoUrls({ cover_photo: null, blocks: [] })).toEqual([]);
  });

  it("폴더·숨김 파일은 사진 수에서 뺀다", () => {
    expect(realPhotoObjects([obj("a.jpg"), obj(".emptyFolderPlaceholder"), obj("sub", null, null)])).toHaveLength(1);
  });

  it("저장된 사진에 없는 오래된 파일만 지운다", () => {
    const got = orphanStoryPhotos({
      storyId: ID,
      objects: [obj("kept.jpg"), obj("cover.jpg"), obj("gone.jpg"), obj("new.jpg", fresh), obj("unknown.jpg", null), obj(".emptyFolderPlaceholder")],
      keptUrls: [url("kept.jpg"), url("cover.jpg"), "https://example.com/x.jpg"],
      supabaseUrl: SB,
      now,
    });
    expect(got).toEqual([`stories/${ID}/gone.jpg`]);
  });

  it("기준 주소가 없으면 아무것도 지우지 않는다", () => {
    expect(orphanStoryPhotos({ storyId: ID, objects: [obj("gone.jpg")], keptUrls: [], supabaseUrl: "", now })).toEqual([]);
  });
});

describe("usesOtherStoryPhoto", () => {
  const OTHER = "22222222-2222-4222-8222-222222222222";
  const otherUrl = `${PUB}place-photos/stories/${OTHER}/a.jpg`;
  const placeUrl = `${PUB}place-photos/places/x/a.jpg`;
  it("다른 이야기 폴더 사진이면 true", () => {
    expect(usesOtherStoryPhoto([url("a.jpg"), otherUrl], ID, SB)).toBe(true);
  });
  it("자기 폴더·가게 사진만이면 false", () => {
    expect(usesOtherStoryPhoto([url("a.jpg"), placeUrl], ID, SB)).toBe(false);
  });
  it("새 글(id 없음)은 이야기 폴더 사진을 못 쓴다", () => {
    expect(usesOtherStoryPhoto([url("a.jpg")], null, SB)).toBe(true);
    expect(usesOtherStoryPhoto([placeUrl], null, SB)).toBe(false);
  });
});
