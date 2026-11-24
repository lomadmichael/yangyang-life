import { t, type Lang } from "@/i18n";
import { CATEGORIES, CATEGORY_KEY } from "@/lib/labels";
import { MapFold } from "./MapFold";
import { SketchMap, type MapPlace } from "./SketchMap";

/**
 * 장소 목록 옆에 붙는 종이 약도 카드 — 머리글(손글씨 안내) + 전체 약도 + 분류색 범례.
 * 손을 올릴 수 없는 화면(터치)에는 「핀을 눌러 보세요」가 나온다(magazine-places.css 의 hover 미디어 질의).
 * fold 를 주면 좁은 화면에서 접을 수 있다.
 */
export function MapCard({
  lang,
  places,
  uid,
  dimIds,
  fold = false,
}: {
  lang: Lang;
  places: MapPlace[];
  uid: string;
  dimIds?: string[];
  fold?: boolean;
}) {
  const cats = CATEGORIES.filter((c) => places.some((p) => p.cat === c));
  const card = (
    <div className="idx-mapcard">
      <div className="sheet-h">
        <p className="hand">
          <span className="hint-hover">{t(lang, "mapHintHover")}</span>
          <span className="hint-touch">{t(lang, "mapHintTouch")}</span>
        </p>
        <span className="it">{t(lang, "mapSheetTitle")}</span>
      </div>
      <SketchMap places={places} lang={lang} uid={uid} dimIds={dimIds} scrollToRow />
      <ul className="cat-key" aria-label={t(lang, "mapKeyLabel")}>
        {cats.map((c) => (
          <li key={c} className={`cat-${c}`}>
            <i aria-hidden="true" />
            {t(lang, CATEGORY_KEY[c])}
          </li>
        ))}
      </ul>
    </div>
  );
  if (!fold) return card;
  return (
    <MapFold openLabel={t(lang, "mapFoldOpen")} closeLabel={t(lang, "mapFoldClose")}>
      {card}
    </MapFold>
  );
}
