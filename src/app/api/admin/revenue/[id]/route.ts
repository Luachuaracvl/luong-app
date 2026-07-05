import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { revenueToJson } from "@/lib/db/revenues";
import {
  deleteRevenueWithSalaries,
  getRevenueDayDetail,
  updateRevenueWithSalaries,
} from "@/lib/salary";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const detail = await getRevenueDayDetail(id);

    if (!detail) {
      return NextResponse.json({ error: "Không tìm thấy doanh thu ngày này" }, { status: 404 });
    }

    return NextResponse.json({ day: detail });
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

export async function PATCH(request: Request, { params }: Params) {  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const { amount, note } = body;

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "Vui lòng nhập doanh thu" },
        { status: 400 }
      );
    }

    const revenueAmount = Number(amount);
    if (Number.isNaN(revenueAmount) || revenueAmount < 0) {
      return NextResponse.json(
        { error: "Doanh thu phải là số không âm" },
        { status: 400 }
      );
    }

    const updated = await updateRevenueWithSalaries(
      id,
      revenueAmount,
      note?.trim() || null
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Không tìm thấy doanh thu" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      revenue: revenueToJson(updated),
      message: "Đã cập nhật doanh thu và tính lại lương ngày này",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Không tìm thấy doanh thu" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;

    await deleteRevenueWithSalaries(id);

    return NextResponse.json({
      ok: true,
      message: "Đã xóa doanh thu và lương ngày này",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Không tìm thấy doanh thu" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
