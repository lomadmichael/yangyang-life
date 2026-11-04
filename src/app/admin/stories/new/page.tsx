import Link from "next/link";
import { listActivities, listPlaces } from "@/lib/queries";
import { translationAvailable } from "@/lib/translate";
import { requireAdmin } from "../../auth";
import { stopOptions } from "../../data";
import { StoryEditor } from "../../_components/StoryEditor";
import { EMPTY_STORY } from "../../_components/story-values";
import { PageTitle } from "../../_components/ui";

export default async function NewStoryPage() {
  const admin = await requireAdmin();
  // 고르기 목록은 원본(샘플 규칙 적용), 미리보기는 방문객이 보는 공개 뷰 값
  const [opts, previewPlaces, previewActivities] = await Promise.all([stopOptions(), listPlaces(), listActivities()]);

  return (
    <>
      <Link href="/admin/stories" className="inline-flex min-h-11 items-center text-sm text-sea">
        ← 이야기 목록
      </Link>
      <PageTitle>이야기 쓰기</PageTitle>
      <p className="-mt-2 text-sm text-muted">
        쓰는 사람: {admin.display_name}. 「초안 저장」한 글은 방문객에게 안 보이고, 「검토 요청」을 누르면 편집이 보고 공개해요. 사진은 초안을
        한 번 저장한 뒤에 올릴 수 있어요.
      </p>
      <StoryEditor
        storyId={null}
        initial={EMPTY_STORY}
        status="draft"
        role={admin.role}
        places={opts.places}
        activities={opts.activities}
        previewPlaces={previewPlaces}
        previewActivities={previewActivities}
        aiEnabled={translationAvailable()}
        authorLine={`글: ${admin.display_name}`}
        nowIso={new Date().toISOString()}
      />
    </>
  );
}
