"use client";

import { formatCurrency, formatMonthLabel } from "@/lib/utils";

export type MonthlyRow = {
  month: string;
  revenue: number;
  salary: number;
  adminNet: number;
  days: number;
};

export function MonthlySummary({ rows }: { rows: MonthlyRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-subtle">Chưa có dữ liệu theo tháng</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.slice(0, 6).map((row) => (
        <div
          key={row.month}
          className="rounded-[var(--radius-md)] p-4 transition"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <p className="font-medium text-fg">{formatMonthLabel(row.month)}</p>
            <span className="badge badge-gray">{row.days} ngày</span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Doanh thu</dt>
              <dd className="font-medium text-fg">{formatCurrency(row.revenue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Lương</dt>
              <dd className="font-medium text-success">{formatCurrency(row.salary)}</dd>
            </div>
            <div
              className="flex justify-between pt-1.5"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <dt className="font-medium text-muted">Admin thu</dt>
              <dd className="font-semibold text-fg">{formatCurrency(row.adminNet)}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
