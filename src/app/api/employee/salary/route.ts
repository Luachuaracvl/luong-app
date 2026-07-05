import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getEmployeeSalarySummary } from "@/lib/salary";

export async function GET() {
  try {
    const session = await requireSession(["EMPLOYEE"]);
    const summary = await getEmployeeSalarySummary(session.id);

    return NextResponse.json({
      employee: {
        id: session.id,
        name: session.name,
        username: session.username,
      },
      ...summary,
    });
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
