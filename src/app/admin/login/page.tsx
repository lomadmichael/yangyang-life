import { redirect } from "next/navigation";
import { getAdmin } from "../auth";
import { LoginForm } from "../_components/LoginForm";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 pt-6">
      <div>
        <h1 className="text-xl font-bold">관리 화면 로그인</h1>
        <p className="mt-1 text-sm text-muted">
          운영 담당에게 받은 <b>개인 코드 8자리</b>를 넣어 주세요. 누가 입력·확인했는지 이 코드로 기록돼요.
        </p>
      </div>
      <LoginForm />
      <p className="text-xs text-muted">코드를 잃어버렸으면 운영 담당에게 재발급을 요청하세요. 다른 사람과 나눠 쓰지 마세요.</p>
    </div>
  );
}
