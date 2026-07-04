import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  createSalaryRecordsForRevenue,
  getDailyStats,
  parseDateInput,
} from "@/lib/salary";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const stats = await getDailyStats(60);
    return NextResponse.json({ stats });
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

export async function POST(request: Request) {
  try {
    await requireSession(["ADMIN"]);
    const body = await request.json();
    const { date, amount, note } = body;

    if (!date || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "Vui lòng nhập ngày và doanh thu" },
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

    const revenueDate = parseDateInput(date);

    const existing = await prisma.dailyRevenue.findUnique({
      where: { date: revenueDate },
      include: { salaries: true },
    });

    if (existing && existing.salaries.length > 0) {
      const updated = await prisma.dailyRevenue.update({
        where: { id: existing.id },
        data: {
          amount: revenueAmount,
          note: note?.trim() || null,
        },
      });

      return NextResponse.json({
        revenue: updated,
        message:
          "Doanh thu đã cập nhật. Lương đã tính trước đó không thay đổi.",
        salariesLocked: true,
      });
    }

    const revenue = existing
      ? await prisma.dailyRevenue.update({
          where: { id: existing.id },
          data: {
            amount: revenueAmount,
            note: note?.trim() || null,
          },
        })
      : await prisma.dailyRevenue.create({
          data: {
            date: revenueDate,
            amount: revenueAmount,
            note: note?.trim() || null,
          },
        });

    await createSalaryRecordsForRevenue(revenue.id, revenueDate, revenueAmount);

    const stats = await getDailyStats(1);

    return NextResponse.json({
      revenue,
      message: "Đã cập nhật doanh thu và tính lương cho nhân viên",
      dayStat: stats[0] ?? null,
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
