import { NextResponse } from "next/server";
import { findRevenueByDate, revenueToJson } from "@/lib/db/revenues";
import { findSalaryRecordsByRevenue } from "@/lib/db/salaries";
import { requireSession } from "@/lib/auth";
import {
  createSalaryRecordsForRevenue,
  getDailyStats,
  parseDateInput,
  recordNewRevenueDay,
  updateRevenueAmountOnly,
} from "@/lib/salary";
import { dateToKey } from "@/lib/utils";

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
    const dateKey = dateToKey(revenueDate);
    const trimmedNote = note?.trim() || null;
    const existing = await findRevenueByDate(revenueDate);

    if (existing) {
      const salaries = await findSalaryRecordsByRevenue(existing.id);

      if (salaries.length > 0) {
        const updated = await updateRevenueAmountOnly(
          revenueDate,
          revenueAmount,
          trimmedNote
        );

        return NextResponse.json({
          revenue: revenueToJson({
            id: updated.id,
            dateKey: updated.dateKey,
            date: updated.date,
            amount: updated.amount,
            note: updated.note,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          }),
          message:
            "Doanh thu đã cập nhật. Lương đã tính trước đó không thay đổi.",
          salariesLocked: true,
        });
      }

      const updated = await updateRevenueAmountOnly(
        revenueDate,
        revenueAmount,
        trimmedNote
      );
      const salaryResult = await createSalaryRecordsForRevenue(
        existing.id,
        dateKey,
        revenueDate,
        revenueAmount
      );

      return NextResponse.json({
        revenue: revenueToJson({
          id: updated.id,
          dateKey: updated.dateKey,
          date: updated.date,
          amount: updated.amount,
          note: updated.note,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        }),
        message: "Đã cập nhật doanh thu và tính lương cho nhân viên",
        dayStat: {
          id: updated.id,
          date: updated.date.toDate().toISOString(),
          revenue: updated.amount,
          totalSalary: salaryResult.totalSalary,
          adminNet: updated.amount - salaryResult.totalSalary,
          employeeCount: salaryResult.employeeCount,
        },
      });
    }

    const { revenue, totalSalary, employeeCount } = await recordNewRevenueDay(
      revenueDate,
      revenueAmount,
      trimmedNote
    );

    return NextResponse.json({
      revenue: revenueToJson({
        id: revenue.id,
        dateKey: revenue.dateKey,
        date: revenue.date,
        amount: revenue.amount,
        note: revenue.note,
        createdAt: revenue.createdAt,
        updatedAt: revenue.updatedAt,
      }),
      message: "Đã cập nhật doanh thu và tính lương cho nhân viên",
      dayStat: {
        id: revenue.id,
        date: revenue.date.toDate().toISOString(),
        revenue: revenue.amount,
        totalSalary,
        adminNet: revenue.amount - totalSalary,
        employeeCount,
      },
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
