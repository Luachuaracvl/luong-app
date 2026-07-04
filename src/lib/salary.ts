import { findEmployees } from "@/lib/db/users";
import { listRevenues } from "@/lib/db/revenues";
import {
  createSalaryRecord,
  findSalaryRecord,
  findSalaryRecordsByUser,
  findSalaryRecordsByRevenue,
  getAllSalaryRecords,
} from "@/lib/db/salaries";
import {
  getPercentageForDate as getPctFromHistory,
} from "@/lib/db/percentage-history";
import { findUserById } from "@/lib/db/users";
import { calculateSalary, parseDateInput, toDateOnly } from "./utils";

export async function getPercentageForDate(
  userId: string,
  date: Date
): Promise<number> {
  const fromHistory = await getPctFromHistory(userId, date);
  if (fromHistory !== undefined) return fromHistory;

  const user = await findUserById(userId);
  return user?.salaryPercentage ?? 0;
}

export async function createSalaryRecordsForRevenue(
  dailyRevenueId: string,
  dateKey: string,
  date: Date,
  amount: number
) {
  const employees = await findEmployees();
  const activeEmployees = employees.filter((e) => e.isActive);

  for (const employee of activeEmployees) {
    const existing = await findSalaryRecord(employee.id, dailyRevenueId);
    if (existing) continue;

    const percentage = await getPercentageForDate(employee.id, date);
    const salaryAmount = calculateSalary(amount, percentage);

    await createSalaryRecord({
      userId: employee.id,
      dailyRevenueId,
      dateKey,
      percentageUsed: percentage,
      salaryAmount,
    });
  }
}

export async function getEmployeeSalarySummary(userId: string) {
  const [records, revenues] = await Promise.all([
    findSalaryRecordsByUser(userId),
    listRevenues(500),
  ]);

  const revenueMap = new Map(revenues.map((r) => [r.id, r]));

  const enriched = records
    .map((r) => {
      const revenue = revenueMap.get(r.dailyRevenueId);
      if (!revenue) return null;
      return {
        id: r.id,
        date: revenue.date.toDate().toISOString(),
        revenue: revenue.amount,
        percentageUsed: r.percentageUsed,
        salary: r.salaryAmount,
      };
    })
    .filter(Boolean) as {
    id: string;
    date: string;
    revenue: number;
    percentageUsed: number;
    salary: number;
  }[];

  enriched.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalSalary = enriched.reduce((sum, r) => sum + r.salary, 0);
  const totalRevenue = enriched.reduce((sum, r) => sum + r.revenue, 0);

  return { records: enriched, totalSalary, totalRevenue };
}

export async function getDailyStats(limit = 30) {
  const revenues = await listRevenues(limit);

  const stats = await Promise.all(
    revenues.map(async (rev) => {
      const salaries = await findSalaryRecordsByRevenue(rev.id);
      return {
        id: rev.id,
        date: rev.date.toDate().toISOString(),
        revenue: rev.amount,
        totalSalary: salaries.reduce((sum, s) => sum + s.salaryAmount, 0),
        employeeCount: salaries.length,
      };
    })
  );

  return stats;
}

export async function getOverviewStats() {
  const [revenues, allSalaries, employees] = await Promise.all([
    listRevenues(500),
    getAllSalaryRecords(),
    findEmployees(),
  ]);

  return {
    totalRevenue: revenues.reduce((sum, r) => sum + r.amount, 0),
    totalSalary: allSalaries.reduce((sum, s) => sum + s.salaryAmount, 0),
    employeeCount: employees.filter((e) => e.isActive).length,
    revenueDays: revenues.length,
  };
}

export { parseDateInput, toDateOnly };
