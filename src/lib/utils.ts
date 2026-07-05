export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function toDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateToInputValue(date: Date): string {
  return dateToKey(date);
}

/** Calendar date YYYY-MM-DD in the user's local timezone */
export function localDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateToKey(toDateOnly(d));
}

export function isToday(date: Date | string): boolean {
  return localDateKey(date) === localDateKey(new Date());
}

export function calculateSalary(revenue: number, percentage: number): number {
  return Math.round((revenue * percentage) / 100);
}

export function monthKeyFromDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  return `Tháng ${m}/${y}`;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const prefix =
    hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  return `${prefix}, ${name.split(" ")[0]}`;
}

export function computeMonthlySummary<
  T extends { date: string; revenue: number; totalSalary: number; adminNet: number }
>(stats: T[]) {
  const map = new Map<
    string,
    { revenue: number; salary: number; adminNet: number; days: number }
  >();

  for (const d of stats) {
    const key = monthKeyFromDate(d.date);
    const cur = map.get(key) ?? { revenue: 0, salary: 0, adminNet: 0, days: 0 };
    cur.revenue += d.revenue;
    cur.salary += d.totalSalary;
    cur.adminNet += d.adminNet;
    cur.days += 1;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

export function computeEmployeeMonthlySummary<
  T extends { date: string; salary: number }
>(records: T[]) {
  const map = new Map<string, { salary: number; days: number }>();

  for (const r of records) {
    const key = monthKeyFromDate(r.date);
    const cur = map.get(key) ?? { salary: 0, days: 0 };
    cur.salary += r.salary;
    cur.days += 1;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => b.month.localeCompare(a.month));
}
