import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/admin-input";
import { photoUrl } from "@/lib/format";
import { can } from "@/lib/permissions";
import { translationAvailable } from "@/lib/translate";
import { requireAdmin } from "../../auth";
import { contributorNames, getPlaceAdmin, isStale, listMenuAdmin } from "../../data";
import { DeleteButton } from "../../_components/DeleteButton";
import { PhotoManager } from "../../_components/PhotoManager";
import { PlaceForm } from "../../_components/PlaceForm";
import { placeToValues } from "../../_components/place-values";
import { VerifiedNote } from "../../_components/VerifiedNote";
import { VerifyPanel } from "../../_components/VerifyPanel";
import { Card, PageTitle, Pill, btnSecondary } from "../../_components/ui";

export default async function EditPlacePage({ params }: PageProps<"/admin/places/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [place, names, menu] = await Promise.all([getPlaceAdmin(id), contributorNames(), listMenuAdmin(id)]);
  if (!place) notFound();

  const verifiedBy = place.verified_by ? (names.get(place.verified_by) ?? null) : null;
  const createdBy = place.created_by ? (names.get(place.created_by) ?? null) : null;
  const participating = place.status === "participating";
  const menuEn = menu.filter((m) => m.name_en?.trim()).length;

  return (
    <>
      <Link href="/admin/places" className="inline-flex min-h-11 items-center text-sm text-sea">
        ← 가게 목록
      </Link>
      <PageTitle>{place.name_ko}</PageTitle>
      <div className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        {place.is_sample ? <Pill tone="muted">샘플</Pill> : null}
        <span>등록: {createdBy ?? "기록 없음"}</span>
        <Link href={`/ko/place/${place.slug}`} target="_blank" className="text-sea underline underline-offset-2">
          공개 화면 보기 ↗
        </Link>
      </div>

      <Card title="확인 기록">
        <VerifiedNote
          at={place.verified_at}
          by={verifiedBy}
          method={place.verified_method}
          stale={place.status !== "closed" && isStale(place.verified_at, new Date())}
        />
        <VerifyPanel kind="place" id={place.id} current={place.verified_method} />
        <p className="text-xs text-muted">
          직접 보거나 들은 뒤에 눌러 주세요. 공개 화면에 「정리·확인: {admin.display_name} · 오늘 날짜」로 나가요.
        </p>
      </Card>

      <PlaceForm placeId={place.id} code={place.code} initial={placeToValues(place)} aiEnabled={translationAvailable()} />

      <Card
        title="메뉴"
        aside={
          <Link href={`/admin/places/${place.id}/menu`} className={btnSecondary}>
            메뉴 편집
          </Link>
        }
      >
        <p className="text-sm text-muted">
          메뉴 {menu.length}개 · 영문 이름 있는 것 {menuEn}개
          {participating ? "" : " — 영어 메뉴판은 참여 가게가 되면 공개돼요."}
        </p>
      </Card>

      <Card title="사진">
        {participating ? (
          <PhotoManager placeId={place.id} photos={place.photos.map((name) => ({ name, url: photoUrl(name) }))} />
        ) : (
          <p className="text-sm text-muted">
            사진은 사장님이 동의한 「참여 가게」만 올릴 수 있어요. 위 「상태」를 참여 가게로 바꾸고 저장하면 업로드 칸이 열려요.
          </p>
        )}
      </Card>

      {/* Task 7: QR·인쇄 버튼 자리 — QR(svg/png) 다운로드 · 영어 메뉴판 인쇄 */}
      <Card title="QR · 인쇄">
        <p className="text-sm text-muted">
          QR 코드 <span className="font-mono">{place.code}</span> — QR 다운로드·메뉴판 인쇄 버튼은 곧 여기에 생겨요.
        </p>
      </Card>

      {can(admin.role, "delete_content") ? (
        <Card title="지우기 (운영 담당만)">
          <p className="text-sm text-muted">폐업했으면 지우기보다 상태를 「휴업·폐업」으로 바꾸는 걸 권해요.</p>
          <DeleteButton kind="place" id={place.id} name={place.name_ko} />
        </Card>
      ) : null}
    </>
  );
}
