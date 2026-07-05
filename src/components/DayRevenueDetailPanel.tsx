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

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-section">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-fg">{value}</p>
    </div>
  );
}

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
    return <p className="py-6 text-center text-sm text-muted">Không có dữ liệu chi tiết</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatBlock label="Doanh thu ngày" value={formatCurrency(detail.revenue)} />
        <StatBlock label="Tổng lương nhân viên" value={formatCurrency(detail.totalSalary)} />
        <StatBlock label="Tổng % đã chia" value={`${detail.totalPercentageUsed}%`} />
        <StatBlock label="Admin thu về" value={formatCurrency(detail.adminNet)} />
      </div>

      {detail.note && (
        <p className="alert alert-success text-sm">Ghi chú: {detail.note}</p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-fg">
          Chia % cho {detail.employeeCount} nhân viên — {formatDate(detail.date)}
        </p>
        <p className="mb-3 text-xs text-muted">
          Lương mỗi người = doanh thu ngày × % áp dụng tại thời điểm tính lương
        </p>

        {detail.employees.length === 0 ? (
          <p className="py-6 text-center text-sm text-subtle">
            Chưa có bản ghi lương cho ngày này
          </p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {detail.employees.map((emp) => (
                <div key={emp.userId} className="mobile-record-card">
                  <div className="mb-2 flex items-center gap-3">
                    <UserAvatar
                      name={emp.name}
                      avatarUrl={emp.avatarUrl}
                      userId={emp.userId}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-fg">{emp.name}</p>
                      <p className="text-xs text-muted">@{emp.username}</p>
                    </div>
                  </div>
                  <dl>
                    <dt>% áp dụng</dt>
                    <dd className="font-semibold text-fg">{emp.percentageUsed}%</dd>
                    <dt>Lương nhận</dt>
                    <dd className="font-semibold text-success">{formatCurrency(emp.salary)}</dd>
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
                            <UserAvatar
                              name={emp.name}
                              avatarUrl={emp.avatarUrl}
                              userId={emp.userId}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium text-fg">{emp.name}</p>
                              <p className="text-xs text-muted">
                                @{emp.username}
                                {!emp.isActive ? " · Tạm ngưng" : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="font-semibold text-fg">{emp.percentageUsed}%</td>
                        <td className="font-semibold text-success">
                          {formatCurrency(emp.salary)}
                        </td>
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
