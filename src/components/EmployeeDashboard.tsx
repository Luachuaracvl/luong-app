"use client";

import { useEffect, useMemo, useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { writeAvatar } from "@/lib/avatar-cache";
import { AlertBanner } from "./AlertBanner";
import { ChatPanel } from "./ChatPanel";
import { DashboardShell } from "./DashboardShell";
import { EmptyState } from "./EmptyState";
import { IconChat, IconDownload, IconProfile, IconSalary } from "./Icons";
import { MonthFilter, filterByMonth, getMonthOptions } from "./MonthFilter";
import { ProfilePanel } from "./ProfilePanel";
import { SalaryTable } from "./SalaryTable";
import { SectionHeader } from "./SectionHeader";
import { StatCard } from "./StatCard";
import {
  computeEmployeeMonthlySummary,
  downloadCsv,
  formatCurrency,
  formatDate,
  formatMonthLabel,
  getGreeting,
} from "@/lib/utils";

type User = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  username?: string;
  avatarUrl?: string | null;
};

type Tab = "salary" | "chat" | "profile";

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
  const { user: profileUser, setUser: setProfileUser } = useUserProfile(user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employee/salary")
      .then(async (res) => {
        if (!res.ok) {
          setError("Không thể tải dữ liệu lương");
          return;
        }
        setData(await res.json());
      })
      .catch(() => setError("Không thể kết nối server"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user.avatarUrl) writeAvatar(user.id, user.avatarUrl);
  }, [user.avatarUrl, user.id]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const todaySalary = data?.records.find(
    (r) => new Date(r.date).toISOString().slice(0, 10) === todayStr
  );

  const filteredRecords = data ? filterByMonth(data.records, monthFilter) : [];
  const monthlySummary = useMemo(
    () => (data ? computeEmployeeMonthlySummary(data.records) : []),
    [data]
  );

  const filteredMonthSalary = filteredRecords.reduce((s, r) => s + r.salary, 0);

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

  const navItems = [
    { id: "salary", label: "Lương của tôi", shortLabel: "Lương", icon: <IconSalary className="h-5 w-5" /> },
    { id: "chat", label: "Chat", shortLabel: "Chat", icon: <IconChat className="h-5 w-5" /> },
    { id: "profile", label: "Hồ sơ", shortLabel: "Hồ sơ", icon: <IconProfile className="h-5 w-5" /> },
  ];

  return (
    <DashboardShell
      user={profileUser}
      navItems={navItems}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
      pageTitle={
        tab === "salary"
          ? getGreeting(profileUser.name)
          : tab === "chat"
            ? "Chat nhóm"
            : "Hồ sơ cá nhân"
      }
      pageSubtitle={
        tab === "salary"
          ? "Theo dõi lương hàng ngày và lịch sử chi trả"
          : tab === "chat"
            ? "Trao đổi với admin và đồng nghiệp"
            : "Cập nhật thông tin và mật khẩu"
      }
    >
      <AlertBanner type="error" message={error} onDismiss={() => setError("")} />

        {tab === "chat" && (
          <ChatPanel
            currentUser={{
              id: profileUser.id,
              name: profileUser.name,
              role: profileUser.role,
              avatarUrl: profileUser.avatarUrl,
            }}
          />
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
            setProfileUser({
              name: p.name,
              avatarUrl: p.avatarUrl,
            })
          }
        />
      )}

      {tab === "salary" && loading && (
        <div className="space-y-4">
          <div className="skeleton h-36 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
        </div>
      )}

      {tab === "salary" && data && !loading && (
        <div className="space-y-6">
          {todaySalary ? (
            <div className="hero-stat hero-stat-emerald text-white">
              <p className="text-sm font-medium text-emerald-100">
                Lương hôm nay · {formatDate(todaySalary.date)}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {formatCurrency(todaySalary.salary)}
              </p>
              <p className="mt-2 text-sm text-emerald-100/90">
                {todaySalary.percentageUsed}% doanh thu {formatCurrency(todaySalary.revenue)}
              </p>
            </div>
          ) : (
            <div className="card border-amber-100 bg-amber-50/80">
              <p className="font-semibold text-amber-900">Chưa có lương hôm nay</p>
              <p className="mt-1 text-sm text-amber-700">
                Admin chưa cập nhật doanh thu cho ngày hôm nay. Vui lòng quay lại sau.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Tổng lương" value={data.totalSalary} icon="salary" accent="emerald" />
            <StatCard
              label={monthFilter === "all" ? "Số ngày đã tính" : "Lương tháng đã lọc"}
              value={monthFilter === "all" ? data.records.length : filteredMonthSalary}
              format={monthFilter === "all" ? "number" : "currency"}
              icon="chart"
              accent="indigo"
            />
            <StatCard
              label="Lương hôm nay"
              format={todaySalary ? "currency" : "text"}
              value={todaySalary ? todaySalary.salary : "—"}
              hint={todaySalary ? `${todaySalary.percentageUsed}% doanh thu` : "Chưa có dữ liệu"}
              icon="revenue"
              accent="amber"
            />
          </div>

          {monthlySummary.length > 0 && (
            <div className="card">
              <SectionHeader title="Tổng hợp theo tháng" description="Lương đã nhận mỗi tháng" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {monthlySummary.slice(0, 6).map((row) => (
                  <div
                    key={row.month}
                    className="rounded-xl border border-slate-100 bg-gradient-to-br from-white to-emerald-50/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800">{formatMonthLabel(row.month)}</p>
                      <span className="badge badge-green">{row.days} ngày</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-emerald-700">
                      {formatCurrency(row.salary)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionHeader
              title="Lịch sử lương"
              action={
                <>
                  <MonthFilter
                    value={monthFilter}
                    onChange={setMonthFilter}
                    options={getMonthOptions(data.records.map((r) => r.date))}
                  />
                  <button
                    type="button"
                    onClick={exportMySalaryCsv}
                    className="btn btn-secondary w-full sm:w-auto"
                    disabled={filteredRecords.length === 0}
                  >
                    <IconDownload className="h-4 w-4" />
                    Xuất CSV
                  </button>
                </>
              }
            />
            {filteredRecords.length === 0 ? (
              <EmptyState title="Không có dữ liệu" description="Thử chọn tháng khác hoặc chờ admin cập nhật doanh thu" />
            ) : (
              <SalaryTable records={filteredRecords} showRevenue={false} />
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
