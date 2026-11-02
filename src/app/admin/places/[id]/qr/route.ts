import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/admin-input";
import { menuQrPng, menuQrSvg } from "@/lib/menu-url";
import { getAdmin } from "../../../auth";
import { getPlaceAdmin } from "../../../data";

// 레이아웃은 route handler 를 감싸지 않으므로 여기서 직접 세션을 확인한다.
export async function GET(req: NextRequest, ctx: RouteContext<"/admin/places/[id]/qr">) {
  const admin = await getAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });

  const { id } = await ctx.params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });
  const place = await getPlaceAdmin(id);
  if (!place) return new NextResponse("Not found", { status: 404 });
  if (place.status !== "participating") {
    return new NextResponse("참여 가게(status=participating)만 QR 을 만들 수 있어요.", { status: 400 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "svg";
  if (format !== "svg" && format !== "png") {
    return new NextResponse("format 은 svg 또는 png 만 가능해요.", { status: 400 });
  }

  const headers = {
    "Content-Disposition": `attachment; filename="yangyang-menu-${place.code}.${format}"`,
    "Cache-Control": "no-store",
  };
  if (format === "png") {
    const png = await menuQrPng(place.code);
    return new NextResponse(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  return new NextResponse(await menuQrSvg(place.code), {
    headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}
