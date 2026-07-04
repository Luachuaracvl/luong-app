import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  createUser,
  findEmployees,
  findUserByUsername,
  userToJson,
} from "@/lib/db/users";
import { createPercentageHistory } from "@/lib/db/percentage-history";
import { getAllSalaryRecords } from "@/lib/db/salaries";
import { groupSalariesByUser, sumSalary } from "@/lib/db/salary-aggregates";
import { requireSession } from "@/lib/auth";
import { toDateOnly } from "@/lib/utils";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);

    const [employees, allSalaries] = await Promise.all([
      findEmployees(),
      getAllSalaryRecords(),
    ]);
    const byUser = groupSalariesByUser(allSalaries);

    const result = employees.map((e) => {
      const records = byUser.get(e.id) ?? [];
      return {
        id: e.id,
        username: e.username,
        name: e.name,
        salaryPercentage: e.salaryPercentage,
        isActive: e.isActive,
        totalSalary: sumSalary(records),
        recordCount: records.length,
        createdAt: e.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ employees: result });
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

    const existing = await findUserByUsername(username.trim());
    if (existing) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const today = toDateOnly(new Date());

    const employee = await createUser({
      username: username.trim(),
      passwordHash,
      name: name.trim(),
      role: "EMPLOYEE",
      salaryPercentage: pct,
    });

    await createPercentageHistory(employee.id, pct, today);

    return NextResponse.json({
      employee: userToJson(employee),
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