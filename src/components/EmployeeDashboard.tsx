"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "./AppHeader";
import { ProfilePanel } from "./ProfilePanel";
import { MonthFilter, filterByMonth, getMonthOptions } from "./MonthFilter";
import { SalaryTable } from "./SalaryTable";
import { StatCard } from "./StatCard";
import { downloadCsv, formatCurrency, formatDate } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  username?: string;
  avatarUrl?: string | null;
};

type Tab = "salary" | "profile";

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
  const [tab, setTab] = useState<Tab>("salary");
  const [data, setData] = useState<SalaryData | null>(null);
  const [error, setError] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [profileUser, setProfileUser] = useState<User>(user);
  const [profileLoaded, setProfileLoaded] = useState(false);

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

  useEffect(() => {
    if (tab !== "profile" || profileLoaded) return;
    fetch("/api/profile")
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          setProfileUser((prev) => ({ ...prev, ...json.user }));
          setProfileLoaded(true);
        }
      })
      .catch(() => {});
  }, [tab, profileLoaded]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const todaySalary = data?.records.find(
    (r) => new Date(r.date).toISOString().slice(0, 10) === todayStr
  );

  const filteredRecords = data
    ? filterByMonth(data.records, monthFilter)
    : [];

  function exportMySalaryCsv() {
    if (!data) return;
    downloadCsv("luong-cua-toi.csv", [
      ["Ngày", "% lương", "Lương"],
      ...filteredRecords.map((r) => [
        formatDate(r.date),
        String(r.percentageUsed),
        String(r.salary),
      ]),
    ]);
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        user={profileUser}
        onOpenProfile={() => setTab("profile")}
      />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("salary")}
            className={`btn ${tab === "salary" ? "btn-primary" : "btn-secondary"}`}
          >
            Lương của tôi
          </button>
          <button
            onClick={() => setTab("profile")}
            className={`btn ${tab === "profile" ? "btn-primary" : "btn-secondary"}`}
          >
            Hồ sơ
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {tab === "profile" && (
          <ProfilePanel
            user={{
              id: profileUser.id,
              username: profileUser.username ?? data?.employee.username ?? "",
              name: profileUser.name,
              role: profileUser.role,
              avatarUrl: profileUser.avatarUrl,
            }}
            onUpdated={(p) =>
              setProfileUser((prev) => ({
                ...prev,
                name: p.name,
                avatarUrl: p.avatarUrl,
              }))
            }
          />
        )}

        {tab === "salary" && data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Tổng lương" value={data.totalSalary} />
              <StatCard
                label="Lương hôm nay"
                format={todaySalary ? "currency" : "text"}
                value={
                  todaySalary ? todaySalary.salary : "Chưa có dữ liệu"
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Lịch sử lương</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <MonthFilter
                    value={monthFilter}
                    onChange={setMonthFilter}
                    options={getMonthOptions(data.records.map((r) => r.date))}
                  />
                  <button
                    type="button"
                    onClick={exportMySalaryCsv}
                    className="btn btn-secondary"
                    disabled={filteredRecords.length === 0}
                  >
                    Xuất CSV
                  </button>
                </div>
              </div>
              <SalaryTable records={filteredRecords} showRevenue={false} />
            </div>
          </div>
        )}

        {tab === "salary" && !data && !error && (
          <div className="card text-center text-slate-500">Đang tải...</div>
        )}
      </main>
    </div>
  );
}
