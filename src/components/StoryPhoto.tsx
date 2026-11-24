import Image from "next/image";
import { t, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import type { Story } from "@/lib/types";
import { STORY_VISUAL } from "./category-visual";
import { SafeImage } from "./SafeImage";

/** 이야기 사진: 표지 사진 → 없으면 갈래 대표 사진(+ 「분류 대표 사진」 표기) */
export function StoryPhoto({ story, lang, sizes }: { story: Story; lang: Lang; sizes: string }) {
  const fallback = STORY_VISUAL[story.type]?.photo ?? null;
  if (story.cover_photo) {
    return (
      <SafeImage
        src={photoUrl(story.cover_photo)}
        alt=""
        fallbackSrc={fallback}
        fallbackLabel={t(lang, "categoryPhotoLabel")}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  if (!fallback) return null;
  return (
    <>
      <Image src={fallback} alt="" fill sizes={sizes} />
      <span className="rep">{t(lang, "categoryPhotoLabel")}</span>
    </>
  );
}
