"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

type ChartPoint = {
  date: string;
  revenue: number;
  totalSalary: number;
};

function shortMoney(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

export function RevenueChart({ data }: { data: ChartPoint[] }) {
  const points = [...data].slice(0, 7).reverse();
  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Chưa có dữ liệu biểu đồ
      </div>
    );
  }

  const maxRevenue = Math.max(...points.map((p) => p.revenue), 1);

  return (
    <div className="space-y-4">
      <div className="flex h-48 items-end gap-1.5 sm:h-44 sm:gap-3">
        {points.map((p) => {
          const revH = Math.max(8, (p.revenue / maxRevenue) * 100);
          const salH = Math.max(4, (p.totalSalary / maxRevenue) * 100);
          return (
            <div
              key={p.date}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-32 w-full items-end justify-center gap-0.5 sm:h-36 sm:gap-1">
                <div
                  className="chart-bar w-[45%] opacity-90"
                  style={{ height: `${revH}%` }}
                  title={`Doanh thu: ${formatCurrency(p.revenue)}`}
                />
                <div
                  className="chart-bar-secondary w-[45%]"
                  style={{ height: `${salH}%` }}
                  title={`Lương: ${formatCurrency(p.totalSalary)}`}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] font-medium text-slate-400 sm:text-xs">
                {formatDate(p.date).slice(0, 5)}
              </span>
              <span className="w-full truncate text-center text-[9px] text-slate-500 sm:hidden">
                {shortMoney(p.revenue)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
          Doanh thu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
          Lương
        </span>
      </div>
    </div>
  );
}
