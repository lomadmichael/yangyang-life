import { connection } from "next/server";
import { notFound } from "next/navigation";
import { MenuMarks } from "@/components/MenuMarks";
import { pickText, t } from "@/i18n";
import { formatWon } from "@/lib/format";
import { menuQrSvg } from "@/lib/menu-url";
import { getPlaceByCode, listMenu } from "@/lib/queries";
import { PrintButton } from "./PrintButton";

// A4 세로 한 장. 화면에서는 종이 모양으로 미리 보고, 인쇄할 때는 여백(@page)만 남긴다.
const PRINT_CSS = `
@page { size: A4 portrait; margin: 12mm; }
html, body { background: var(--surface); }
.sheet { width: 186mm; margin: 0 auto; }
.sheet li span.inline-flex { font-size: 9.5px; line-height: 1.25; padding: 0 5px; }
@media screen {
  body { background: var(--sand); padding: 8mm 0; }
  .sheet { background: var(--surface); padding: 12mm; width: 210mm; min-height: 297mm; box-sizing: border-box; }
}
@media print {
  .no-print { display: none !important; }
  .sheet { width: auto; padding: 0; }
  * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  li { break-inside: avoid; }
}
`;

// 공개 영어 메뉴판(/en/m/[code])과 같은 조건·같은 데이터. 아니면 404.
export default async function PrintMenuPage({ params }: PageProps<"/print/menu/[code]">) {
  const { code } = await params;
  await connection();

  const place = await getPlaceByCode(code);
  if (!place || place.status !== "participating" || !place.has_english_menu) notFound();
  const menu = await listMenu(place.id);
  const nameEn = pickText(place as unknown as Record<string, unknown>, "name", "en");
  const qr = (await menuQrSvg(place.code)).replace("<svg", '<svg width="100%" height="100%"');

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="sheet flex flex-col text-ink">
        <header className="flex items-start justify-between gap-4 border-b-2 border-sea pb-2">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-widest text-sea">{t("en", "siteName")}</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight">{nameEn.text}</h1>
            <p lang="ko" className="text-lg text-muted">
              {place.name_ko}
            </p>
            <p className="mt-1 text-sm text-muted">{t("en", "menuTitle")}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="h-[30mm] w-[30mm]" dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="text-xs font-medium">Scan for the English menu</p>
          </div>
        </header>

        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0">
          {menu.map((m) => (
            <li key={m.id} className="border-b border-line py-[3px]">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 leading-tight">
                  <span lang="ko" className="text-[14px] font-bold">
                    {m.name_ko}
                  </span>
                  {m.name_roman ? <span className="ml-1.5 text-[10px] text-muted">{m.name_roman}</span> : null}
                </p>
                <p className="shrink-0 text-[13px] font-bold tabular-nums">{m.price != null ? formatWon(m.price) : ""}</p>
              </div>
              {m.name_en?.trim() ? (
                <p lang="en" className="text-[13px] font-medium leading-tight">
                  {m.name_en}
                </p>
              ) : null}
              {m.desc_en?.trim() ? (
                <p lang="en" className="line-clamp-2 text-[10px] leading-[1.25] text-muted">
                  {m.desc_en}
                </p>
              ) : null}
              {m.price == null ? <p className="text-xs text-muted">{t("en", "menuAskPrice")}</p> : null}
              <MenuMarks item={m} lang="en" className="mt-0.5" />
            </li>
          ))}
        </ul>

        <footer className="mt-auto pt-4 text-center text-xs text-muted">{t("en", "footerSupport")}</footer>
      </div>
      <div className="no-print mx-auto mt-4 flex justify-center pb-6">
        <PrintButton />
      </div>
    </>
  );
}
