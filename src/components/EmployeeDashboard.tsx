"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { writeAvatar } from "@/lib/avatar-cache";
import { AlertBanner } from "./AlertBanner";
import { SimpleChat } from "./SimpleChat";
import { DashboardShell } from "./DashboardShell";
import { EmptyState } from "./EmptyState";
import { IconChat, IconDownload, IconProfile, IconSalary } from "./Icons";
import { MonthFilter, filterByMonth, getMonthOptions } from "./MonthFilter";
import { MonthlySummary } from "./MonthlySummary";
import { ProfilePanel } from "./ProfilePanel";
import { SalaryTable } from "./SalaryTable";
import { SectionHeader } from "./SectionHeader";
import { StatCard } from "./StatCard";
import { TeamOnlinePanel } from "./TeamOnlinePanel";
import {
  computeEmployeeMonthlySummary,
  downloadCsv,
  formatCurrency,
  formatDate,
  getGreeting,
  isToday,
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
  const { members: teamMembers } = useTeamMembers();

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

  const todaySalary = data?.records.find((r) => isToday(r.date));

  const filteredRecords = data ? filterByMonth(data.records, monthFilter) : [];
  const monthlySummary = useMemo(
    () => (data ? computeEmployeeMonthlySummary(data.records) : []),
    [data]
  );

  const monthlyRows = useMemo(
    () =>
      monthlySummary.map((row) => ({
        month: row.month,
        revenue: 0,
        salary: row.salary,
        adminNet: 0,
        days: row.days,
      })),
    [monthlySummary]
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
            ? "Chat"
            : "Hồ sơ"
      }
      pageSubtitle={tab === "salary" ? "Theo dõi lương hàng ngày" : undefined}
      showSubtitleOnMobile={false}
      fullBleed={tab === "chat"}
    >
      <AlertBanner type="error" message={error} onDismiss={() => setError("")} />

      {tab === "chat" && (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <SimpleChat
            currentUser={{
              id: profileUser.id,
              name: profileUser.name,
              role: profileUser.role,
              avatarUrl: profileUser.avatarUrl,
            }}
          />
        </div>
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
          <div className="skeleton h-32 w-full rounded-[var(--radius-lg)]" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
          </div>
        </div>
      )}

      {tab === "salary" && data && !loading && (
        <div className="space-y-6">
          {todaySalary ? (
            <div className="hero-stat hero-stat-emerald">
              <p className="hero-stat-label text-sm font-medium">
                Lương hôm nay · {formatDate(todaySalary.date)}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {formatCurrency(todaySalary.salary)}
              </p>
              <p className="hero-stat-sub mt-2 text-sm">
                {todaySalary.percentageUsed}% doanh thu {formatCurrency(todaySalary.revenue)}
              </p>
            </div>
          ) : (
            <div className="notice-warning">
              <p className="notice-title">Chưa có lương hôm nay</p>
              <p className="notice-desc">
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
              accent="violet"
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

          {teamMembers.length > 0 && <TeamOnlinePanel members={teamMembers} />}

          {monthlyRows.length > 0 && (
            <div className="card">
              <SectionHeader compact title="Tổng hợp theo tháng" description="Lương đã nhận mỗi tháng" />
              <MonthlySummary rows={monthlyRows} variant="salary" />
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
              <EmptyState
                title="Không có dữ liệu"
                description="Thử chọn tháng khác hoặc chờ admin cập nhật doanh thu"
              />
            ) : (
              <SalaryTable records={filteredRecords} showRevenue={false} />
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
