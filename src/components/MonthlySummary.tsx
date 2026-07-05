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
      <p className="text-center text-sm text-slate-400 py-6">Chưa có dữ liệu theo tháng</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.slice(0, 6).map((row) => (
        <div
          key={row.month}
          className="rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 transition hover:border-indigo-100 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">
              {formatMonthLabel(row.month)}
            </p>
            <span className="badge badge-gray">{row.days} ngày</span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Doanh thu</dt>
              <dd className="font-medium">{formatCurrency(row.revenue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Lương</dt>
              <dd className="font-medium text-emerald-700">
                {formatCurrency(row.salary)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-1.5">
              <dt className="font-medium text-indigo-600">Admin thu</dt>
              <dd className="font-bold text-indigo-700">
                {formatCurrency(row.adminNet)}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
