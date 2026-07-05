"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

type ChartPoint = {
  date: string;
  revenue: number;
  totalSalary: number;
};

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
      <div className="flex h-44 items-end gap-2 sm:gap-3">
        {points.map((p) => {
          const revH = Math.max(8, (p.revenue / maxRevenue) * 100);
          const salH = Math.max(4, (p.totalSalary / maxRevenue) * 100);
          return (
            <div
              key={p.date}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-36 w-full items-end justify-center gap-0.5 sm:gap-1">
                <div
                  className="chart-bar w-[45%] opacity-90 group-hover:opacity-100"
                  style={{ height: `${revH}%` }}
                  title={`Doanh thu: ${formatCurrency(p.revenue)}`}
                />
                <div
                  className="chart-bar-secondary w-[45%]"
                  style={{ height: `${salH}%` }}
                  title={`Lương: ${formatCurrency(p.totalSalary)}`}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-400 sm:text-xs">
                {formatDate(p.date).slice(0, 5)}
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
