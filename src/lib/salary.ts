import { findEmployees } from "@/lib/db/users";
import { listRevenues } from "@/lib/db/revenues";
import {
  createSalaryRecord,
  findSalaryRecord,
  findSalaryRecordsByUser,
  getAllSalaryRecords,
} from "@/lib/db/salaries";
import {
  groupSalariesByRevenue,
  groupSalariesByUser,
  sumSalary,
} from "@/lib/db/salary-aggregates";
import { findPercentageHistoryByUser } from "@/lib/db/percentage-history";
import { findUserById } from "@/lib/db/users";
import { calculateSalary, parseDateInput, toDateOnly } from "./utils";

export async function getPercentageForDate(
  userId: string,
  date: Date,
  historyCache?: Map<string, Awaited<ReturnType<typeof findPercentageHistoryByUser>>>
) {
  const target = toDateOnly(date).getTime();
  const history =
    historyCache?.get(userId) ?? (await findPercentageHistoryByUser(userId));
  const match = history.find((h) => h.effectiveFrom.toMillis() <= target);
  if (match) return match.percentage;

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
  const historyCache = new Map<
    string,
    Awaited<ReturnType<typeof findPercentageHistoryByUser>>
  >();

  await Promise.all(
    activeEmployees.map(async (employee) => {
      const existing = await findSalaryRecord(employee.id, dailyRevenueId);
      if (existing) return;

      if (!historyCache.has(employee.id)) {
        historyCache.set(
          employee.id,
          await findPercentageHistoryByUser(employee.id)
        );
      }

      const percentage = await getPercentageForDate(
        employee.id,
        date,
        historyCache
      );
      const salaryAmount = calculateSalary(amount, percentage);

      await createSalaryRecord({
        userId: employee.id,
        dailyRevenueId,
        dateKey,
        percentageUsed: percentage,
        salaryAmount,
        revenueAmount: amount,
      });
    })
  );
}

function dateKeyToIso(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

export async function getEmployeeSalarySummary(userId: string) {
  const records = await findSalaryRecordsByUser(userId);
  const missingRevenue = records.some((r) => r.revenueAmount === undefined);

  let revenueMap = new Map<string, number>();
  if (missingRevenue) {
    const revenues = await listRevenues(500);
    revenueMap = new Map(revenues.map((r) => [r.id, r.amount]));
  }

  const enriched = records
    .map((r) => ({
      id: r.id,
      date: dateKeyToIso(r.dateKey),
      revenue: r.revenueAmount ?? revenueMap.get(r.dailyRevenueId) ?? 0,
      percentageUsed: r.percentageUsed,
      salary: r.salaryAmount,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSalary = enriched.reduce((sum, r) => sum + r.salary, 0);
  const totalRevenue = enriched.reduce((sum, r) => sum + r.revenue, 0);

  return { records: enriched, totalSalary, totalRevenue };
}

export async function getDailyStats(limit = 30) {
  const [revenues, allSalaries] = await Promise.all([
    listRevenues(limit),
    getAllSalaryRecords(),
  ]);
  const byRevenue = groupSalariesByRevenue(allSalaries);

  return revenues.map((rev) => {
    const salaries = byRevenue.get(rev.id) ?? [];
    return {
      id: rev.id,
      date: rev.date.toDate().toISOString(),
      revenue: rev.amount,
      totalSalary: sumSalary(salaries),
      employeeCount: salaries.length,
    };
  });
}

export async function getOverviewStats() {
  const [revenues, allSalaries, employees] = await Promise.all([
    listRevenues(500),
    getAllSalaryRecords(),
    findEmployees(),
  ]);

  return {
    totalRevenue: revenues.reduce((sum, r) => sum + r.amount, 0),
    totalSalary: sumSalary(allSalaries),
    employeeCount: employees.filter((e) => e.isActive).length,
    revenueDays: revenues.length,
  };
}

export async function getAdminDashboardData() {
  const [revenues, allSalaries, employees] = await Promise.all([
    listRevenues(60),
    getAllSalaryRecords(),
    findEmployees(),
  ]);

  const byRevenue = groupSalariesByRevenue(allSalaries);
  const byUser = groupSalariesByUser(allSalaries);

  const stats = revenues.map((rev) => {
    const salaries = byRevenue.get(rev.id) ?? [];
    return {
      id: rev.id,
      date: rev.date.toDate().toISOString(),
      revenue: rev.amount,
      totalSalary: sumSalary(salaries),
      employeeCount: salaries.length,
    };
  });

  const overview = {
    totalRevenue: revenues.reduce((sum, r) => sum + r.amount, 0),
    totalSalary: sumSalary(allSalaries),
    employeeCount: employees.filter((e) => e.isActive).length,
    revenueDays: revenues.length,
  };

  const employeeList = employees
    .map((e) => {
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
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
    );

  return { overview, stats, employees: employeeList };
}

export { parseDateInput, toDateOnly };
