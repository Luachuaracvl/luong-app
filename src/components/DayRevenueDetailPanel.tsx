"use client";

import { UserAvatar } from "./UserAvatar";
import { formatCurrency, formatDate } from "@/lib/utils";

export type DayRevenueDetail = {
  id: string;
  date: string;
  revenue: number;
  note: string | null;
  totalSalary: number;
  adminNet: number;
  employeeCount: number;
  totalPercentageUsed: number;
  employees: {
    userId: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
    isActive: boolean;
    currentPercentage: number;
    percentageUsed: number;
    salary: number;
    revenue: number;
  }[];
};

export function DayRevenueDetailPanel({
  detail,
  loading,
}: {
  detail: DayRevenueDetail | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3 py-4">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    );
  }

  if (!detail) {
    return <p className="py-6 text-center text-sm text-slate-500">Không có dữ liệu chi tiết</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-indigo-50 px-4 py-3">
          <p className="text-xs font-medium text-indigo-600">Doanh thu ngày</p>
          <p className="text-lg font-bold text-indigo-800">{formatCurrency(detail.revenue)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium text-emerald-600">Tổng lương nhân viên</p>
          <p className="text-lg font-bold text-emerald-800">{formatCurrency(detail.totalSalary)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-600">Tổng % đã chia</p>
          <p className="text-lg font-bold text-slate-800">{detail.totalPercentageUsed}%</p>
        </div>
        <div className="rounded-xl bg-violet-50 px-4 py-3">
          <p className="text-xs font-medium text-violet-600">Admin thu về</p>
          <p className="text-lg font-bold text-violet-800">{formatCurrency(detail.adminNet)}</p>
        </div>
      </div>

      {detail.note && (
        <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Ghi chú: {detail.note}
        </p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">
          Chia % cho {detail.employeeCount} nhân viên — {formatDate(detail.date)}
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Lương mỗi người = doanh thu ngày × % áp dụng tại thời điểm tính lương
        </p>

        {detail.employees.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Chưa có bản ghi lương cho ngày này
          </p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {detail.employees.map((emp) => (
                <div key={emp.userId} className="mobile-record-card">
                  <div className="mb-2 flex items-center gap-3">
                    <UserAvatar name={emp.name} avatarUrl={emp.avatarUrl} size="sm" />
                    <div>
                      <p className="font-semibold text-slate-800">{emp.name}</p>
                      <p className="text-xs text-slate-500">@{emp.username}</p>
                    </div>
                  </div>
                  <dl>
                    <dt>% áp dụng</dt>
                    <dd className="font-semibold text-indigo-700">{emp.percentageUsed}%</dd>
                    <dt>Lương nhận</dt>
                    <dd className="font-semibold text-emerald-700">{formatCurrency(emp.salary)}</dd>
                  </dl>
                  {!emp.isActive && <span className="badge badge-red mt-2">Đã ngưng</span>}
                </div>
              ))}
            </div>

            <div className="table-wrap hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>% áp dụng</th>
                    <th>Lương nhận</th>
                    <th>% trong tổng lương</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.employees.map((emp) => {
                    const share =
                      detail.totalSalary > 0
                        ? Math.round((emp.salary / detail.totalSalary) * 1000) / 10
                        : 0;
                    return (
                      <tr key={emp.userId}>
                        <td>
                          <div className="flex items-center gap-3">
                            <UserAvatar name={emp.name} avatarUrl={emp.avatarUrl} size="sm" />
                            <div>
                              <p className="font-medium text-slate-800">{emp.name}</p>
                              <p className="text-xs text-slate-500">
                                @{emp.username}
                                {!emp.isActive ? " · Tạm ngưng" : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="font-semibold text-indigo-700">{emp.percentageUsed}%</td>
                        <td className="font-semibold text-emerald-700">{formatCurrency(emp.salary)}</td>
                        <td>{share}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
