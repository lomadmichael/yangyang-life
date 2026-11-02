import { translationAvailable } from "@/lib/translate";
import { requireAdmin } from "../../auth";
import { placeOptions } from "../../data";
import { ActivityForm } from "../../_components/ActivityForm";
import { EMPTY_ACTIVITY } from "../../_components/activity-values";
import { PageTitle } from "../../_components/ui";

export default async function NewActivityPage() {
  await requireAdmin();
  return (
    <>
      <PageTitle>새 할 거리</PageTitle>
      <ActivityForm activityId={null} initial={EMPTY_ACTIVITY} places={await placeOptions()} aiEnabled={translationAvailable()} />
    </>
  );
}
