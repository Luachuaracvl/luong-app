"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "./AppHeader";
import { SalaryTable } from "./SalaryTable";
import { StatCard } from "./StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
};

type SalaryData = {
  employee: { id: string; name: string; username: string };
  records: {
    id: string;
    date: string;
    revenue: number;
    percentageUsed: number;
    salary: number;
  }[];
  totalSalary: number;
  totalRevenue: number;
};

export default function EmployeeDashboard({ user }: { user: User }) {
  const [data, setData] = useState<SalaryData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/employee/salary")
      .then(async (res) => {
        if (!res.ok) {
          setError("Không thể tải dữ liệu lương");
          return;
        }
        setData(await res.json());
      })
      .catch(() => setError("Không thể kết nối server"));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const todaySalary = data?.records.find(
    (r) => new Date(r.date).toISOString().slice(0, 10) === todayStr
  );

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Tổng lương" value={data.totalSalary} />
              <StatCard
                label="Lương hôm nay"
                format={todaySalary ? "currency" : "text"}
                value={
                  todaySalary
                    ? todaySalary.salary
                    : "Chưa có dữ liệu"
                }
                hint={
                  todaySalary
                    ? `${todaySalary.percentageUsed}% doanh thu ${formatCurrency(todaySalary.revenue)}`
                    : "Admin chưa cập nhật doanh thu hôm nay"
                }
              />
            </div>

            {todaySalary && (
              <div className="card border-emerald-200 bg-emerald-50">
                <h2 className="font-semibold text-emerald-800">
                  Lương ngày {formatDate(todaySalary.date)}
                </h2>
                <p className="mt-2 text-3xl font-bold text-emerald-700">
                  {formatCurrency(todaySalary.salary)}
                </p>
                <p className="mt-1 text-sm text-emerald-600">
                  Doanh thu: {formatCurrency(todaySalary.revenue)} ·{" "}
                  {todaySalary.percentageUsed}% lương
                </p>
              </div>
            )}

            <div>
              <h2 className="mb-4 text-lg font-semibold">Lịch sử lương</h2>
              <SalaryTable records={data.records} showRevenue={false} />
            </div>
          </div>
        )}

        {!data && !error && (
          <div className="card text-center text-slate-500">Đang tải...</div>
        )}
      </main>
    </div>
  );
}
