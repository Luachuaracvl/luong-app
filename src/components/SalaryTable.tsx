"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

type SalaryRecord = {
  id: string;
  date: string;
  revenue: number;
  percentageUsed: number;
  salary: number;
};

export function SalaryTable({
  records,
  showRevenue = true,
}: {
  records: SalaryRecord[];
  showRevenue?: boolean;
}) {
  if (records.length === 0) {
    return (
      <div className="card text-center text-slate-500">
        Chưa có dữ liệu lương.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Ngày</th>
            {showRevenue && <th>Doanh thu</th>}
            <th>% lương</th>
            <th>Lương</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{formatDate(r.date)}</td>
              {showRevenue && <td>{formatCurrency(r.revenue)}</td>}
              <td>{r.percentageUsed}%</td>
              <td className="font-semibold text-emerald-700">
                {formatCurrency(r.salary)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
