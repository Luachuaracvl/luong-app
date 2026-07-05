import { calculateSalary } from "./utils";

export type OptimisticEmployee = {
  id: string;
  username: string;
  name: string;
  salaryPercentage: number;
  isActive: boolean;
  totalSalary: number;
};

export type OptimisticDayStat = {
  id: string;
  date: string;
  revenue: number;
  totalSalary: number;
  adminNet: number;
  employeeCount: number;
  note?: string | null;
  _pending?: boolean;
};

export type OptimisticOverview = {
  totalRevenue: number;
  totalSalary: number;
  adminNetIncome: number;
  employeeCount: number;
  revenueDays: number;
};

export function dateKeyToIso(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

export function estimateDayStat(
  dateKey: string,
  amount: number,
  note: string | null | undefined,
  employees: OptimisticEmployee[],
  options?: { keepSalary?: number; keepEmployeeCount?: number }
): OptimisticDayStat {
  const active = employees.filter((e) => e.isActive);
  const totalSalary =
    options?.keepSalary ??
    active.reduce(
      (sum, e) => sum + calculateSalary(amount, e.salaryPercentage),
      0
    );
  const employeeCount = options?.keepEmployeeCount ?? active.length;

  return {
    id: dateKey,
    date: dateKeyToIso(dateKey),
    revenue: amount,
    totalSalary,
    adminNet: amount - totalSalary,
    employeeCount,
    note: note ?? null,
    _pending: true,
  };
}

export function recalculateDayStatAmount(
  day: OptimisticDayStat,
  newAmount: number,
  note?: string | null
): OptimisticDayStat {
  const totalSalary =
    day.revenue > 0
      ? Math.round(day.totalSalary * (newAmount / day.revenue))
      : day.totalSalary;

  return {
    ...day,
    revenue: newAmount,
    totalSalary,
    adminNet: newAmount - totalSalary,
    note: note !== undefined ? note : day.note,
    _pending: true,
  };
}

export function patchOverview(
  prev: OptimisticOverview,
  delta: {
    revenue?: number;
    salary?: number;
    days?: number;
    employeeCount?: number;
  }
): OptimisticOverview {
  const totalRevenue = prev.totalRevenue + (delta.revenue ?? 0);
  const totalSalary = prev.totalSalary + (delta.salary ?? 0);
  return {
    ...prev,
    totalRevenue,
    totalSalary,
    adminNetIncome: totalRevenue - totalSalary,
    revenueDays: prev.revenueDays + (delta.days ?? 0),
    employeeCount: prev.employeeCount + (delta.employeeCount ?? 0),
  };
}

export function mergeDayStat(
  stats: OptimisticDayStat[],
  day: OptimisticDayStat
): OptimisticDayStat[] {
  const filtered = stats.filter((d) => d.id !== day.id);
  return [day, ...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
