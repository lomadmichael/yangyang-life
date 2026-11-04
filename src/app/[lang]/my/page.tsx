import { notFound } from "next/navigation";
import { isLang } from "@/i18n";
import { listMyTips, type MyTip } from "./actions";
import { MyClient } from "./MyClient";

// MY — 껍데기. 저장 목록은 이 기기의 localStorage 에 있어 브라우저(MyClient)가 불러온다.
// 「내가 남긴 팁」은 httpOnly 기기 쿠키로 여기서(서버) 읽어 넘긴다.
export default async function MyPage({ params }: PageProps<"/[lang]/my">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  let tips: MyTip[] | null;
  try {
    tips = await listMyTips(lang);
  } catch {
    tips = null; // 화면은 그대로, 팁 칸에만 「불러오지 못했어요」
  }

  return <MyClient lang={lang} tips={tips} />;
}
