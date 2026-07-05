"use client";

import { formatCurrency, formatMonthLabel } from "@/lib/utils";

export type MonthlyRow = {
  month: string;
  revenue: number;
  salary: number;
  adminNet: number;
  days: number;
};

export function MonthlySummary({
  rows,
  variant = "full",
}: {
  rows: MonthlyRow[];
  variant?: "full" | "salary";
}) {
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
          className="summary-month-card"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium text-fg">{formatMonthLabel(row.month)}</p>
            <span className="badge badge-gray">{row.days} ngày</span>
          </div>
          {variant === "full" ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Doanh thu</dt>
                <dd className="font-medium text-fg">{formatCurrency(row.revenue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Lương</dt>
                <dd className="font-medium text-success">{formatCurrency(row.salary)}</dd>
              </div>
              <div className="divider-section flex justify-between pt-1.5">
                <dt className="font-medium text-muted">Admin thu</dt>
                <dd className="font-semibold text-fg">{formatCurrency(row.adminNet)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-xl font-semibold text-success">
              {formatCurrency(row.salary)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
