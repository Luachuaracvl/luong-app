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
    <>
      <div className="space-y-3 md:hidden">
        {records.map((r) => (
          <div key={r.id} className="mobile-record-card">
            <p className="mb-3 font-semibold text-slate-900">
              {formatDate(r.date)}
            </p>
            <dl>
              {showRevenue && (
                <>
                  <dt>Doanh thu</dt>
                  <dd>{formatCurrency(r.revenue)}</dd>
                </>
              )}
              <dt>% lương</dt>
              <dd>{r.percentageUsed}%</dd>
              <dt>Lương</dt>
              <dd className="font-semibold text-emerald-700">
                {formatCurrency(r.salary)}
              </dd>
            </dl>
          </div>
        ))}
      </div>

      <div className="table-wrap hidden md:block">
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
    </>
  );
}
