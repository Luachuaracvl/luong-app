import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/salary";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const data = await getAdminDashboardData();
    return NextResponse.json(data);
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
