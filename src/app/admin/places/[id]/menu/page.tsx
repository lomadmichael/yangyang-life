import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/admin-input";
import { translationAvailable } from "@/lib/translate";
import { requireAdmin } from "../../../auth";
import { getPlaceAdmin, listMenuAdmin } from "../../../data";
import { MenuEditor } from "../../../_components/MenuEditor";
import { PageTitle } from "../../../_components/ui";

export default async function MenuPage({ params }: PageProps<"/admin/places/[id]/menu">) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [place, menu] = await Promise.all([getPlaceAdmin(id), listMenuAdmin(id)]);
  if (!place) notFound();

  return (
    <>
      <Link href={`/admin/places/${place.id}`} className="inline-flex min-h-11 items-center text-sm text-sea">
        ← {place.name_ko}
      </Link>
      <PageTitle>메뉴 편집</PageTitle>
      <p className="-mt-2 text-sm text-muted">
        위에서부터 메뉴판 순서예요. ↑↓로 순서를 바꾸고 맨 아래 「저장」을 눌러야 반영돼요.
        {place.status !== "participating" ? " 영어 메뉴판은 참여 가게가 되면 공개돼요." : ""}
      </p>
      <MenuEditor
        placeId={place.id}
        aiEnabled={translationAvailable()}
        initial={menu.map((m) => ({
          key: m.id,
          id: m.id,
          name_ko: m.name_ko,
          name_roman: m.name_roman ?? "",
          name_en: m.name_en ?? "",
          desc_en: m.desc_en ?? "",
          price: m.price === null ? "" : String(m.price),
          allergens: m.allergens ?? [],
          vegan: m.vegan,
          spicy: m.spicy,
        }))}
      />
    </>
  );
}
