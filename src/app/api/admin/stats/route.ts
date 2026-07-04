import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getOverviewStats } from "@/lib/salary";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const stats = await getOverviewStats();
    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
