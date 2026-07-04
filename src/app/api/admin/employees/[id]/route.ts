import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { getEmployeeSalarySummary } from "@/lib/salary";
import { toDateOnly } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;

    const employee = await prisma.user.findFirst({
      where: { id, role: "EMPLOYEE" },
      include: {
        percentageHistory: { orderBy: { effectiveFrom: "desc" } },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404 }
      );
    }

    const summary = await getEmployeeSalarySummary(id);

    return NextResponse.json({
      employee: {
        id: employee.id,
        username: employee.username,
        name: employee.name,
        salaryPercentage: employee.salaryPercentage,
        isActive: employee.isActive,
        percentageHistory: employee.percentageHistory,
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

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const body = await request.json();

    const employee = await prisma.user.findFirst({
      where: { id, role: "EMPLOYEE" },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404 }
      );
    }

    const data: {
      name?: string;
      isActive?: boolean;
      salaryPercentage?: number;
      passwordHash?: string;
    } = {};

    if (body.name?.trim()) data.name = body.name.trim();
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    if (body.salaryPercentage !== undefined) {
      const pct = Number(body.salaryPercentage);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json(
          { error: "Phần trăm lương phải từ 0 đến 100" },
          { status: 400 }
        );
      }

      if (pct !== employee.salaryPercentage) {
        data.salaryPercentage = pct;
        const today = toDateOnly(new Date());

        await prisma.percentageHistory.create({
          data: {
            userId: id,
            percentage: pct,
            effectiveFrom: today,
          },
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      employee: {
        id: updated.id,
        name: updated.name,
        salaryPercentage: updated.salaryPercentage,
        isActive: updated.isActive,
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
