import { translationAvailable } from "@/lib/translate";
import { requireAdmin } from "../../auth";
import { PlaceForm } from "../../_components/PlaceForm";
import { EMPTY_PLACE } from "../../_components/place-values";
import { PageTitle } from "../../_components/ui";

export default async function NewPlacePage() {
  await requireAdmin();
  return (
    <>
      <PageTitle>새 가게</PageTitle>
      <p className="-mt-2 text-sm text-muted">저장하면 등록자로 내 이름이 남아요. 사진·메뉴·확인 완료는 저장한 뒤 이어서 할 수 있어요.</p>
      <PlaceForm placeId={null} initial={EMPTY_PLACE} aiEnabled={translationAvailable()} />
    </>
  );
}
