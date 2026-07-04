import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { toDateOnly } from "@/lib/utils";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);

    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { salaryRecords: true } },
        salaryRecords: {
          select: { salaryAmount: true },
        },
      },
    });

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        username: e.username,
        name: e.name,
        salaryPercentage: e.salaryPercentage,
        isActive: e.isActive,
        totalSalary: e.salaryRecords.reduce((s, r) => s + r.salaryAmount, 0),
        recordCount: e._count.salaryRecords,
        createdAt: e.createdAt,
      })),
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

export async function POST(request: Request) {
  try {
    await requireSession(["ADMIN"]);
    const body = await request.json();
    const { username, password, name, salaryPercentage } = body;

    if (!username?.trim() || !password || !name?.trim()) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    const pct = Number(salaryPercentage);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json(
        { error: "Phần trăm lương phải từ 0 đến 100" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const today = toDateOnly(new Date());

    const employee = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        name: name.trim(),
        role: "EMPLOYEE",
        salaryPercentage: pct,
        percentageHistory: {
          create: {
            percentage: pct,
            effectiveFrom: today,
          },
        },
      },
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        username: employee.username,
        name: employee.name,
        salaryPercentage: employee.salaryPercentage,
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
