import type { PercentageHistory } from "@prisma/client";
import { prisma } from "./prisma";
import { calculateSalary, parseDateInput, toDateOnly } from "./utils";

export async function getPercentageForDate(
  userId: string,
  date: Date
): Promise<number> {
  const target = toDateOnly(date);

  const history = await prisma.percentageHistory.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: target },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (history) return history.percentage;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.salaryPercentage ?? 0;
}

export async function createSalaryRecordsForRevenue(
  dailyRevenueId: string,
  date: Date,
  amount: number
) {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
  });

  for (const employee of employees) {
    const existing = await prisma.salaryRecord.findUnique({
      where: {
        userId_dailyRevenueId: {
          userId: employee.id,
          dailyRevenueId,
        },
      },
    });

    if (existing) continue;

    const percentage = await getPercentageForDate(employee.id, date);
    const salaryAmount = calculateSalary(amount, percentage);

    await prisma.salaryRecord.create({
      data: {
        userId: employee.id,
        dailyRevenueId,
        percentageUsed: percentage,
        salaryAmount,
      },
    });
  }
}

export async function getEmployeeSalarySummary(userId: string) {
  const records = await prisma.salaryRecord.findMany({
    where: { userId },
    include: { dailyRevenue: true },
    orderBy: { dailyRevenue: { date: "desc" } },
  });

  const totalSalary = records.reduce((sum, r) => sum + r.salaryAmount, 0);
  const totalRevenue = records.reduce(
    (sum, r) => sum + r.dailyRevenue.amount,
    0
  );

  return {
    records: records.map((r) => ({
      id: r.id,
      date: r.dailyRevenue.date,
      revenue: r.dailyRevenue.amount,
      percentageUsed: r.percentageUsed,
      salary: r.salaryAmount,
    })),
    totalSalary,
    totalRevenue,
  };
}

export async function getDailyStats(limit = 30) {
  const revenues = await prisma.dailyRevenue.findMany({
    include: {
      salaries: true,
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  return revenues.map((rev) => ({
    id: rev.id,
    date: rev.date,
    revenue: rev.amount,
    totalSalary: rev.salaries.reduce((sum, s) => sum + s.salaryAmount, 0),
    employeeCount: rev.salaries.length,
  }));
}

export async function getOverviewStats() {
  const [totalRevenueAgg, totalSalaryAgg, employeeCount, revenueDays] =
    await Promise.all([
      prisma.dailyRevenue.aggregate({ _sum: { amount: true } }),
      prisma.salaryRecord.aggregate({ _sum: { salaryAmount: true } }),
      prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
      prisma.dailyRevenue.count(),
    ]);

  return {
    totalRevenue: totalRevenueAgg._sum.amount ?? 0,
    totalSalary: totalSalaryAgg._sum.salaryAmount ?? 0,
    employeeCount,
    revenueDays,
  };
}

export { parseDateInput, toDateOnly };
