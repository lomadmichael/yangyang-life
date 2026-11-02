import { Badge } from "@/components/Badge";
import { hasKey, t, type Lang } from "@/i18n";
import type { MenuItem } from "@/lib/types";

function allergenLabel(lang: Lang, code: string): string {
  const key = `allergen.${code}`;
  return hasKey(key) ? t(lang, key) : code;
}

/** 맵기 0~3 → ●●○ (화면 읽기 프로그램에는 「맵기 2/3」) */
function Spicy({ level, lang }: { level: MenuItem["spicy"]; lang: Lang }) {
  if (!level) return null;
  return (
    <Badge tone="partner">
      <span aria-hidden="true">
        {t(lang, "menuSpicy")} {"●".repeat(level) + "○".repeat(3 - level)}
      </span>
      <span className="sr-only">
        {t(lang, "menuSpicy")} {level}/3
      </span>
    </Badge>
  );
}

/** 비건·맵기·알레르기 표시 묶음 (공개 메뉴판과 인쇄 메뉴판이 같이 쓴다). 표시할 게 없으면 아무것도 안 그림 */
export function MenuMarks({ item, lang, className = "mt-3" }: { item: MenuItem; lang: Lang; className?: string }) {
  if (!item.vegan && !item.spicy && !item.allergens.length) return null;
  return (
    <div className={`${className} flex flex-wrap gap-1.5`}>
      {item.vegan ? <Badge tone="open">{t(lang, "menuVegan")}</Badge> : null}
      <Spicy level={item.spicy} lang={lang} />
      {item.allergens.length ? (
        <Badge tone="muted">
          {t(lang, "menuContains")}: {item.allergens.map((a) => allergenLabel(lang, a)).join(", ")}
        </Badge>
      ) : null}
    </div>
  );
}
