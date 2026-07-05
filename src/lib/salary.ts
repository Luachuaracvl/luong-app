import { findEmployees } from "@/lib/db/users";
import {
  batchAdjustUserSalaryTotals,
  batchCreateSalaryRecordsWithUserTotals,
  batchUpdateSalaryRecords,
  deleteSalariesByRevenue,
  findSalaryRecordsByRevenue,
  findSalaryRecordsByUser,
  getAllSalaryRecords,
  getSalaryRecordsForRevenueIds,
} from "@/lib/db/salaries";
import {
  deleteRevenue,
  findRevenueById,
  listRevenues,
  updateRevenueTotals,
  upsertRevenue,
} from "@/lib/db/revenues";
import { groupSalariesByRevenue, groupSalariesByUser, sumSalary } from "@/lib/db/salary-aggregates";
import { findPercentageHistoryForUsers } from "@/lib/db/percentage-history";
import { adjustGlobalStats, getGlobalStats, setGlobalStats } from "@/lib/db/stats";
import { calculateSalary, parseDateInput, toDateOnly } from "./utils";

type HistoryList = Awaited<
  ReturnType<typeof findPercentageHistoryForUsers>
> extends Map<string, infer T>
  ? T
  : never;

function resolvePercentage(
  userId: string,
  fallbackPercentage: number,
  date: Date,
  historyMap: Map<string, HistoryList>
) {
  const target = toDateOnly(date).getTime();
  const history = historyMap.get(userId) ?? [];
  const match = history.find((h) => h.effectiveFrom.toMillis() <= target);
  return match?.percentage ?? fallbackPercentage;
}

async function ensureGlobalStats() {
  const stats = await getGlobalStats();
  if (stats.revenueDays > 0 || stats.totalRevenue > 0 || stats.totalSalary > 0) {
    return stats;
  }

  const [revenues, salaries] = await Promise.all([
    listRevenues(500),
    getAllSalaryRecords(),
  ]);

  const computed = {
    totalRevenue: revenues.reduce((sum, r) => sum + r.amount, 0),
    totalSalary: sumSalary(salaries),
    revenueDays: revenues.length,
  };

  if (computed.revenueDays > 0 || computed.totalSalary > 0) {
    await setGlobalStats(computed);
  }

  return computed;
}

async function ensureEmployeeTotals(
  employees: Awaited<ReturnType<typeof findEmployees>>
) {
  const missing = employees.filter((e) => e.totalSalary === undefined);
  if (missing.length === 0) return employees;

  const allSalaries = await getAllSalaryRecords();
  const byUser = groupSalariesByUser(allSalaries);

  return employees.map((e) => ({
    ...e,
    totalSalary: e.totalSalary ?? sumSalary(byUser.get(e.id) ?? []),
  }));
}

export async function createSalaryRecordsForRevenue(
  dailyRevenueId: string,
  dateKey: string,
  date: Date,
  amount: number
) {
  const [employees, existingSalaries] = await Promise.all([
    findEmployees(),
    findSalaryRecordsByRevenue(dailyRevenueId),
  ]);

  const activeEmployees = employees.filter((e) => e.isActive);
  const existingUserIds = new Set(existingSalaries.map((s) => s.userId));
  const toCreate = activeEmployees.filter((e) => !existingUserIds.has(e.id));

  const historyMap = await findPercentageHistoryForUsers(
    toCreate.map((e) => e.id)
  );

  const newRecords = toCreate.map((employee) => {
    const percentageUsed = resolvePercentage(
      employee.id,
      employee.salaryPercentage,
      date,
      historyMap
    );
    return {
      userId: employee.id,
      dailyRevenueId,
      dateKey,
      percentageUsed,
      salaryAmount: calculateSalary(amount, percentageUsed),
      revenueAmount: amount,
    };
  });

  await batchCreateSalaryRecordsWithUserTotals(newRecords);

  const newSalaryTotal = newRecords.reduce((sum, r) => sum + r.salaryAmount, 0);
  const totalSalary = sumSalary(existingSalaries) + newSalaryTotal;
  const employeeCount = existingSalaries.length + newRecords.length;

  await Promise.all([
    updateRevenueTotals(dailyRevenueId, totalSalary, employeeCount),
    newSalaryTotal > 0
      ? adjustGlobalStats({ totalSalary: newSalaryTotal })
      : Promise.resolve(),
  ]);

  return { totalSalary, employeeCount, created: newRecords.length };
}

async function recalculateSalariesForRevenue(
  dailyRevenueId: string,
  dateKey: string,
  date: Date,
  amount: number
) {
  const [existingSalaries, employees] = await Promise.all([
    findSalaryRecordsByRevenue(dailyRevenueId),
    findEmployees(),
  ]);

  const updates = existingSalaries.map((record) => ({
    id: record.id,
    salaryAmount: calculateSalary(amount, record.percentageUsed),
    revenueAmount: amount,
  }));

  const userDeltas = existingSalaries.map((record) => {
    const updated = updates.find((u) => u.id === record.id)!;
    return { userId: record.userId, delta: updated.salaryAmount - record.salaryAmount };
  });

  const oldTotal = sumSalary(existingSalaries);

  const activeEmployees = employees.filter((e) => e.isActive);
  const existingUserIds = new Set(existingSalaries.map((s) => s.userId));
  const toCreate = activeEmployees.filter((e) => !existingUserIds.has(e.id));
  const historyMap = await findPercentageHistoryForUsers(toCreate.map((e) => e.id));

  const newRecords = toCreate.map((employee) => {
    const percentageUsed = resolvePercentage(
      employee.id,
      employee.salaryPercentage,
      date,
      historyMap
    );
    return {
      userId: employee.id,
      dailyRevenueId,
      dateKey,
      percentageUsed,
      salaryAmount: calculateSalary(amount, percentageUsed),
      revenueAmount: amount,
    };
  });

  await Promise.all([
    batchUpdateSalaryRecords(updates),
    batchAdjustUserSalaryTotals(userDeltas),
    batchCreateSalaryRecordsWithUserTotals(newRecords),
  ]);

  const newTotal =
    updates.reduce((sum, u) => sum + u.salaryAmount, 0) +
    newRecords.reduce((sum, r) => sum + r.salaryAmount, 0);
  const employeeCount = existingSalaries.length + newRecords.length;
  const salaryDelta = newTotal - oldTotal;

  await Promise.all([
    updateRevenueTotals(dailyRevenueId, newTotal, employeeCount),
    salaryDelta !== 0 ? adjustGlobalStats({ totalSalary: salaryDelta }) : Promise.resolve(),
  ]);

  return { totalSalary: newTotal, employeeCount };
}

export async function updateRevenueWithSalaries(
  id: string,
  amount: number,
  note: string | null
) {
  const revenue = await findRevenueById(id);
  if (!revenue) throw new Error("NOT_FOUND");

  const revenueDelta = amount - revenue.amount;
  const date = revenue.date.toDate();

  await upsertRevenue(date, amount, note);
  await recalculateSalariesForRevenue(id, revenue.dateKey, date, amount);

  if (revenueDelta !== 0) {
    await adjustGlobalStats({ totalRevenue: revenueDelta });
  }

  return findRevenueById(id);
}

export async function deleteRevenueWithSalaries(id: string) {
  const revenue = await findRevenueById(id);
  if (!revenue) throw new Error("NOT_FOUND");

  const salaries = await deleteSalariesByRevenue(id);
  const salaryTotal = sumSalary(salaries);

  await Promise.all([
    deleteRevenue(id),
    adjustGlobalStats({
      totalRevenue: -revenue.amount,
      totalSalary: -salaryTotal,
      revenueDays: -1,
    }),
  ]);
}

function dateKeyToIso(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

export async function getEmployeeSalarySummary(userId: string) {
  const records = await findSalaryRecordsByUser(userId);

  const enriched = records
    .map((r) => ({
      id: r.id,
      date: dateKeyToIso(r.dateKey),
      revenue: r.revenueAmount ?? 0,
      percentageUsed: r.percentageUsed,
      salary: r.salaryAmount,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSalary = enriched.reduce((sum, r) => sum + r.salary, 0);
  const totalRevenue = enriched.reduce((sum, r) => sum + r.revenue, 0);

  return { records: enriched, totalSalary, totalRevenue };
}

export async function getDailyStats(limit = 30) {
  const revenues = await listRevenues(limit);
  const missingIds = revenues
    .filter((r) => r.totalSalary === undefined)
    .map((r) => r.id);

  const byRevenue =
    missingIds.length > 0
      ? groupSalariesByRevenue(await getSalaryRecordsForRevenueIds(missingIds))
      : new Map();

  return revenues.map((rev) => {
    const salaries = byRevenue.get(rev.id);
    const totalSalary = rev.totalSalary ?? (salaries ? sumSalary(salaries) : 0);
    return {
      id: rev.id,
      date: rev.date.toDate().toISOString(),
      revenue: rev.amount,
      totalSalary,
      adminNet: rev.amount - totalSalary,
      employeeCount: rev.employeeCount ?? salaries?.length ?? 0,
    };
  });
}

export async function getOverviewStats() {
  const [globalStats, employees] = await Promise.all([
    ensureGlobalStats(),
    findEmployees(),
  ]);

  return {
    totalRevenue: globalStats.totalRevenue,
    totalSalary: globalStats.totalSalary,
    employeeCount: employees.filter((e) => e.isActive).length,
    revenueDays: globalStats.revenueDays,
  };
}

export async function getAdminDashboardData() {
  const [revenues, employeesRaw, globalStats] = await Promise.all([
    listRevenues(60),
    findEmployees(),
    ensureGlobalStats(),
  ]);

  const employees = await ensureEmployeeTotals(employeesRaw);

  const missingRevenueIds = revenues
    .filter((r) => r.totalSalary === undefined)
    .map((r) => r.id);
  const salaryByRevenue =
    missingRevenueIds.length > 0
      ? groupSalariesByRevenue(await getSalaryRecordsForRevenueIds(missingRevenueIds))
      : new Map();

  const stats = revenues.map((rev) => {
    const salaries = salaryByRevenue.get(rev.id);
    const totalSalary = rev.totalSalary ?? (salaries ? sumSalary(salaries) : 0);
    return {
      id: rev.id,
      date: rev.date.toDate().toISOString(),
      revenue: rev.amount,
      totalSalary,
      adminNet: rev.amount - totalSalary,
      employeeCount: rev.employeeCount ?? salaries?.length ?? 0,
      note: rev.note,
    };
  });

  const overview = {
    totalRevenue: globalStats.totalRevenue,
    totalSalary: globalStats.totalSalary,
    adminNetIncome: globalStats.totalRevenue - globalStats.totalSalary,
    employeeCount: employees.filter((e) => e.isActive).length,
    revenueDays: globalStats.revenueDays,
  };

  const employeeList = employees
    .map((e) => ({
      id: e.id,
      username: e.username,
      name: e.name,
      salaryPercentage: e.salaryPercentage,
      isActive: e.isActive,
      avatarUrl: e.avatarUrl ?? null,
      totalSalary: e.totalSalary ?? 0,
      recordCount: 0,
      createdAt: e.createdAt?.toDate?.()?.toISOString() ?? null,
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );

  return { overview, stats, employees: employeeList };
}

export async function recordNewRevenueDay(
  date: Date,
  amount: number,
  note: string | null
) {
  const result = await upsertRevenue(date, amount, note);

  if (result.isNew) {
    await adjustGlobalStats({ totalRevenue: amount, revenueDays: 1 });
  } else if (result.previousAmount !== amount) {
    await adjustGlobalStats({ totalRevenue: amount - result.previousAmount });
  }

  const salaryResult = await createSalaryRecordsForRevenue(
    result.id,
    result.dateKey,
    date,
    amount
  );

  return { revenue: result, ...salaryResult };
}

export async function updateRevenueAmountOnly(
  date: Date,
  amount: number,
  note: string | null
) {
  const result = await upsertRevenue(date, amount, note);
  if (!result.isNew && result.previousAmount !== amount) {
    await adjustGlobalStats({ totalRevenue: amount - result.previousAmount });
  }
  return result;
}

export { parseDateInput, toDateOnly };
