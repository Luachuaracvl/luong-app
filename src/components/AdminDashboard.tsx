"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertBanner } from "./AlertBanner";
import { DashboardShell } from "./DashboardShell";
import { EmptyState } from "./EmptyState";
import { ChatPanel } from "./ChatPanel";
import {
  IconChat,
  IconDashboard,
  IconDownload,
  IconPlus,
  IconProfile,
  IconRevenue,
  IconSearch,
  IconUsers,
} from "./Icons";
import { DayRevenueDetailPanel, type DayRevenueDetail } from "./DayRevenueDetailPanel";
import { Modal } from "./Modal";
import { MonthlySummary } from "./MonthlySummary";
import { MonthFilter, filterByMonth, getMonthOptions } from "./MonthFilter";
import { ProfilePanel } from "./ProfilePanel";
import { RevenueChart } from "./RevenueChart";
import { SalaryTable } from "./SalaryTable";
import { SectionHeader } from "./SectionHeader";
import { StatCard } from "./StatCard";
import { UserAvatar } from "./UserAvatar";
import {
  computeMonthlySummary,
  dateToInputValue,
  downloadCsv,
  formatCurrency,
  formatDate,
  getGreeting,
} from "@/lib/utils";
import {
  estimateDayStat,
  mergeDayStat,
  patchOverview,
  recalculateDayStatAmount,
} from "@/lib/optimistic-admin";
import { SyncIndicator } from "./SyncIndicator";

type User = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  username?: string;
  avatarUrl?: string | null;
};

type Employee = {
  id: string;
  username: string;
  name: string;
  salaryPercentage: number;
  isActive: boolean;
  totalSalary: number;
  avatarUrl?: string | null;
};

type DayStat = {
  id: string;
  date: string;
  revenue: number;
  totalSalary: number;
  adminNet: number;
  employeeCount: number;
  note?: string | null;
};

type EmployeeDetail = {
  employee: Employee & {
    percentageHistory: { id: string; percentage: number; effectiveFrom: string }[];
  };
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

type Tab = "overview" | "revenue" | "employees" | "chat" | "profile";

const PAGE_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  overview: {
    title: "Tổng quan",
    subtitle: "Thống kê doanh thu, lương và thu nhập admin",
  },
  revenue: {
    title: "Doanh thu",
    subtitle: "Cập nhật doanh thu cuối ngày và tính lương tự động",
  },
  employees: {
    title: "Nhân viên",
    subtitle: "Quản lý tài khoản, phần trăm lương và lịch sử chi trả",
  },
  chat: {
    title: "Chat nhóm",
    subtitle: "Trao đổi nhanh giữa admin và nhân viên",
  },
  profile: {
    title: "Hồ sơ",
    subtitle: "Avatar, tên hiển thị và đổi mật khẩu",
  },
};

export default function AdminDashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState({
    totalRevenue: 0,
    totalSalary: 0,
    adminNetIncome: 0,
    employeeCount: 0,
    revenueDays: 0,
  });
  const [dayStats, setDayStats] = useState<DayStat[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [revenueDate, setRevenueDate] = useState(dateToInputValue(new Date()));
  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueNote, setRevenueNote] = useState("");

  const [newEmployee, setNewEmployee] = useState({
    username: "",
    password: "",
    name: "",
    salaryPercentage: "10",
  });

  const [editPercentage, setEditPercentage] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [overviewMonth, setOverviewMonth] = useState("all");
  const [employeeMonth, setEmployeeMonth] = useState("all");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [profileUser, setProfileUser] = useState<User>(user);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState("");
  const [editingRevenue, setEditingRevenue] = useState<{
    id: string;
    date: string;
    amount: string;
    note: string;
  } | null>(null);
  const [viewingDay, setViewingDay] = useState<DayStat | null>(null);
  const [dayDetail, setDayDetail] = useState<DayRevenueDetail | null>(null);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);

  const navItems = [
    { id: "overview", label: "Tổng quan", shortLabel: "Tổng quan", icon: <IconDashboard className="h-5 w-5" /> },
    { id: "revenue", label: "Doanh thu", shortLabel: "Doanh thu", icon: <IconRevenue className="h-5 w-5" /> },
    { id: "employees", label: "Nhân viên", shortLabel: "NV", icon: <IconUsers className="h-5 w-5" /> },
    { id: "chat", label: "Chat", shortLabel: "Chat", icon: <IconChat className="h-5 w-5" /> },
    { id: "profile", label: "Hồ sơ", shortLabel: "Hồ sơ", icon: <IconProfile className="h-5 w-5" /> },
  ];

  const loadData = useCallback(async (silent = false) => {
    const res = await fetch("/api/admin/dashboard");
    if (!res.ok) return;
    const data = await res.json();
    setOverview(data.overview);
    setDayStats(data.stats);
    setEmployees(data.employees);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    if (tab !== "profile" || profileLoaded) return;
    fetch("/api/profile")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setProfileUser((prev) => ({ ...prev, ...data.user }));
          setProfileLoaded(true);
        }
      })
      .catch(() => {});
  }, [tab, profileLoaded]);

  async function submitRevenue(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    const amount = Number(revenueAmount);
    const dateKey = revenueDate;
    const note = revenueNote.trim() || null;
    const prevOverview = overview;
    const prevDayStats = dayStats;

    const existing = dayStats.find((d) => d.id === dateKey);
    const salariesLocked =
      existing && existing.totalSalary > 0 && existing.employeeCount > 0;

    const optimisticDay = estimateDayStat(dateKey, amount, note, employees, {
      keepSalary: salariesLocked ? existing!.totalSalary : undefined,
      keepEmployeeCount: salariesLocked ? existing!.employeeCount : undefined,
    });

    const isNewDay = !existing;
    const revenueDelta = isNewDay ? amount : amount - (existing?.revenue ?? 0);
    const salaryDelta = salariesLocked
      ? 0
      : optimisticDay.totalSalary - (existing?.totalSalary ?? 0);

    setDayStats((s) => mergeDayStat(s, optimisticDay));
    setOverview((o) =>
      patchOverview(o, {
        revenue: revenueDelta,
        salary: salaryDelta,
        days: isNewDay ? 1 : 0,
      })
    );
    setMessage("Đã lưu doanh thu");
    setRevenueAmount("");
    setRevenueNote("");

    setSyncing(true);
    try {
      const res = await fetch("/api/admin/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: revenueDate, amount, note: revenueNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOverview(prevOverview);
        setDayStats(prevDayStats);
        setError(data.error || "Cập nhật thất bại");
        setMessage("");
        return;
      }
      setSyncDone("Đã đồng bộ");
      loadData(true);
      if (selectedEmployee) {
        fetch(`/api/admin/employees/${selectedEmployee.employee.id}`)
          .then((r) => r.ok && r.json())
          .then((d) => d && setSelectedEmployee(d))
          .catch(() => {});
      }
    } catch {
      setOverview(prevOverview);
      setDayStats(prevDayStats);
      setError("Không thể kết nối server");
      setMessage("");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncDone(""), 2000);
    }
  }

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    const payload = {
      ...newEmployee,
      salaryPercentage: Number(newEmployee.salaryPercentage),
    };
    const tempId = `temp-${Date.now()}`;
    const prevEmployees = employees;
    const prevOverview = overview;

    const optimistic: Employee = {
      id: tempId,
      username: payload.username,
      name: payload.name,
      salaryPercentage: payload.salaryPercentage,
      isActive: true,
      totalSalary: 0,
      avatarUrl: null,
    };

    setEmployees((list) => [optimistic, ...list]);
    setOverview((o) => patchOverview(o, { employeeCount: 1 }));
    setMessage(`Đã thêm ${payload.name}`);
    setNewEmployee({ username: "", password: "", name: "", salaryPercentage: "10" });

    setSyncing(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmployees(prevEmployees);
        setOverview(prevOverview);
        setError(data.error || "Tạo nhân viên thất bại");
        setMessage("");
        return;
      }
      setEmployees((list) =>
        list.map((e) =>
          e.id === tempId
            ? {
                id: data.employee.id,
                username: data.employee.username,
                name: data.employee.name,
                salaryPercentage: data.employee.salaryPercentage,
                isActive: data.employee.isActive,
                totalSalary: 0,
                avatarUrl: data.employee.avatarUrl ?? null,
              }
            : e
        )
      );
      setSyncDone("Đã đồng bộ");
    } catch {
      setEmployees(prevEmployees);
      setOverview(prevOverview);
      setError("Không thể kết nối server");
      setMessage("");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncDone(""), 2000);
    }
  }

  async function loadEmployeeDetail(id: string) {
    const res = await fetch(`/api/admin/employees/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setSelectedEmployee(data);
    setEditPercentage(String(data.employee.salaryPercentage));
    setTab("employees");
  }

  async function updateEmployeePercentage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setMessage("");
    setError("");

    const newPct = Number(editPercentage);
    const empId = selectedEmployee.employee.id;
    const prevEmployees = employees;
    const prevSelected = selectedEmployee;

    setEmployees((list) =>
      list.map((e) =>
        e.id === empId ? { ...e, salaryPercentage: newPct } : e
      )
    );
    setSelectedEmployee({
      ...selectedEmployee,
      employee: { ...selectedEmployee.employee, salaryPercentage: newPct },
    });
    setMessage("Đã cập nhật % lương");

    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/employees/${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaryPercentage: newPct }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmployees(prevEmployees);
        setSelectedEmployee(prevSelected);
        setError(data.error || "Cập nhật thất bại");
        setMessage("");
        return;
      }
      setSyncDone("Đã đồng bộ");
    } catch {
      setEmployees(prevEmployees);
      setSelectedEmployee(prevSelected);
      setError("Không thể kết nối server");
      setMessage("");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncDone(""), 2000);
    }
  }

  async function resetEmployeePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee || !resetPassword) return;
    setMessage("");
    setError("");

    if (resetPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    const newPwd = resetPassword;
    setResetPassword("");
    setMessage(`Đã đặt lại mật khẩu cho ${selectedEmployee.employee.name}`);

    setSyncing(true);
    fetch(`/api/admin/employees/${selectedEmployee.employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Không thể đổi mật khẩu");
          setMessage("");
          return;
        }
        setSyncDone("Đã đồng bộ");
        window.setTimeout(() => setSyncDone(""), 2000);
      })
      .catch(() => {
        setError("Không thể kết nối server");
        setMessage("");
      })
      .finally(() => setSyncing(false));
  }

  async function toggleEmployeeActive() {
    if (!selectedEmployee) return;
    const newActive = !selectedEmployee.employee.isActive;
    const action = newActive ? "kích hoạt" : "tạm ngưng";

    const ok = window.confirm(
      `${newActive ? "Kích hoạt" : "Tạm ngưng"} nhân viên ${selectedEmployee.employee.name}?${
        !newActive ? "\nNhân viên sẽ không được tính lương các ngày mới." : ""
      }`
    );
    if (!ok) return;

    setMessage("");
    setError("");

    const empId = selectedEmployee.employee.id;
    const prevEmployees = employees;
    const prevSelected = selectedEmployee;
    const prevOverview = overview;

    setEmployees((list) =>
      list.map((e) => (e.id === empId ? { ...e, isActive: newActive } : e))
    );
    setSelectedEmployee({
      ...selectedEmployee,
      employee: { ...selectedEmployee.employee, isActive: newActive },
    });
    setOverview((o) =>
      patchOverview(o, { employeeCount: newActive ? 1 : -1 })
    );
    setMessage(`Đã ${action} nhân viên`);

    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/employees/${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmployees(prevEmployees);
        setSelectedEmployee(prevSelected);
        setOverview(prevOverview);
        setError(data.error || `Không thể ${action} nhân viên`);
        setMessage("");
        return;
      }
      setSyncDone("Đã đồng bộ");
    } catch {
      setEmployees(prevEmployees);
      setSelectedEmployee(prevSelected);
      setOverview(prevOverview);
      setError("Không thể kết nối server");
      setMessage("");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncDone(""), 2000);
    }
  }

  function startEditRevenue(day: DayStat) {
    setEditingRevenue({
      id: day.id,
      date: day.date,
      amount: String(day.revenue),
      note: day.note ?? "",
    });
    setMessage("");
    setError("");
  }

  async function openDayDetail(day: DayStat) {
    setViewingDay(day);
    setDayDetail(null);
    setDayDetailLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/revenue/${day.id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tải chi tiết ngày");
        setViewingDay(null);
        return;
      }
      setDayDetail(data.day as DayRevenueDetail);
    } catch {
      setError("Không thể kết nối server");
      setViewingDay(null);
    } finally {
      setDayDetailLoading(false);
    }
  }

  function closeDayDetail() {
    setViewingDay(null);
    setDayDetail(null);
    setDayDetailLoading(false);
  }

  async function saveEditRevenue(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRevenue) return;
    setMessage("");
    setError("");

    const newAmount = Number(editingRevenue.amount);
    const prevOverview = overview;
    const prevDayStats = dayStats;
    const oldDay = dayStats.find((d) => d.id === editingRevenue.id);

    if (oldDay) {
      const updated = recalculateDayStatAmount(
        oldDay,
        newAmount,
        editingRevenue.note
      );
      setDayStats((s) => mergeDayStat(s, updated));
      setOverview((o) =>
        patchOverview(o, {
          revenue: newAmount - oldDay.revenue,
          salary: updated.totalSalary - oldDay.totalSalary,
        })
      );
    }

    setEditingRevenue(null);
    setMessage("Đã cập nhật doanh thu");

    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/revenue/${editingRevenue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: newAmount,
          note: editingRevenue.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOverview(prevOverview);
        setDayStats(prevDayStats);
        setError(data.error || "Cập nhật thất bại");
        setMessage("");
        return;
      }
      setSyncDone("Đã đồng bộ");
      loadData(true);
    } catch {
      setOverview(prevOverview);
      setDayStats(prevDayStats);
      setError("Không thể kết nối server");
      setMessage("");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncDone(""), 2000);
    }
  }

  async function deleteRevenueDay(day: DayStat) {
    const ok = window.confirm(
      `Xóa doanh thu ngày ${formatDate(day.date)}?\nLương nhân viên ngày này cũng sẽ bị xóa.`
    );
    if (!ok) return;

    setMessage("");
    setError("");

    const prevOverview = overview;
    const prevDayStats = dayStats;

    setDayStats((s) => s.filter((d) => d.id !== day.id));
    setOverview((o) =>
      patchOverview(o, {
        revenue: -day.revenue,
        salary: -day.totalSalary,
        days: -1,
      })
    );
    setMessage("Đã xóa doanh thu");

    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/revenue/${day.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setOverview(prevOverview);
        setDayStats(prevDayStats);
        setError(data.error || "Xóa thất bại");
        setMessage("");
        return;
      }
      setSyncDone("Đã đồng bộ");
      loadData(true);
    } catch {
      setOverview(prevOverview);
      setDayStats(prevDayStats);
      setError("Không thể kết nối server");
      setMessage("");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncDone(""), 2000);
    }
  }

  function exportOverviewCsv() {
    const filtered = filterByMonth(dayStats, overviewMonth);
    downloadCsv("thong-ke-doanh-thu-luong.csv", [
      ["Ngày", "Doanh thu", "Tổng lương", "Admin thu", "Số NV"],
      ...filtered.map((d) => [
        formatDate(d.date),
        String(d.revenue),
        String(d.totalSalary),
        String(d.adminNet),
        String(d.employeeCount),
      ]),
    ]);
  }

  const filteredDayStats = filterByMonth(dayStats, overviewMonth);
  const filteredEmployeeRecords = selectedEmployee
    ? filterByMonth(selectedEmployee.records, employeeMonth)
    : [];
  const monthlySummary = useMemo(() => computeMonthlySummary(dayStats), [dayStats]);

  const filteredEmployees = employees.filter((emp) => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.username.toLowerCase().includes(q)
    );
  });

  const page = PAGE_TITLES[tab];
  const greeting = getGreeting(profileUser.name);

  function renderDayStatActions(d: DayStat) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void openDayDetail(d)} className="btn btn-primary px-2 py-1 text-xs">
          Chi tiết
        </button>
        <button type="button" onClick={() => startEditRevenue(d)} className="btn btn-secondary px-2 py-1 text-xs">
          Sửa
        </button>
        <button type="button" onClick={() => deleteRevenueDay(d)} className="btn btn-danger px-2 py-1 text-xs">
          Xóa
        </button>
      </div>
    );
  }

  return (
    <DashboardShell
      user={profileUser}
      navItems={navItems}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
      pageTitle={tab === "overview" ? greeting : page.title}
      pageSubtitle={tab === "overview" ? page.subtitle : page.subtitle}
      headerAction={
        tab === "revenue" ? undefined : tab === "overview" ? (
          <button type="button" onClick={() => setTab("revenue")} className="btn btn-primary">
            <IconPlus className="h-4 w-4" />
            Nhập doanh thu
          </button>
        ) : undefined
      }
    >
      <AlertBanner type="success" message={message} onDismiss={() => setMessage("")} />
      <AlertBanner type="error" message={error} onDismiss={() => setError("")} />

      {loading && tab === "overview" && (
        <div className="space-y-4">
          <div className="skeleton h-32 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {tab === "overview" && !loading && (
        <div className="space-y-6">
          <div className="hero-stat text-white">
            <p className="text-sm font-medium text-indigo-100">
              Tiền admin thu được (doanh thu − lương)
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {formatCurrency(overview.adminNetIncome)}
            </p>
            <p className="mt-2 text-sm text-indigo-100/90">
              {formatCurrency(overview.totalRevenue)} doanh thu −{" "}
              {formatCurrency(overview.totalSalary)} lương đã trả
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tổng doanh thu" value={overview.totalRevenue} icon="revenue" accent="indigo" />
            <StatCard label="Tổng lương đã trả" value={overview.totalSalary} icon="salary" accent="emerald" />
            <StatCard label="Nhân viên hoạt động" value={overview.employeeCount} format="number" icon="users" accent="amber" />
            <StatCard label="Ngày có doanh thu" value={overview.revenueDays} format="number" icon="chart" accent="slate" />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="card lg:col-span-3">
              <SectionHeader title="Biểu đồ 7 ngày gần nhất" description="Doanh thu và lương theo ngày" />
              <RevenueChart data={dayStats} />
            </div>
            <div className="card lg:col-span-2">
              <SectionHeader title="Tháng gần đây" description="Tổng hợp theo tháng" />
              <MonthlySummary rows={monthlySummary} />
            </div>
          </div>

          <div>
            <SectionHeader
              title="Chi tiết theo ngày"
              action={
                <>
                  <MonthFilter
                    value={overviewMonth}
                    onChange={setOverviewMonth}
                    options={getMonthOptions(dayStats.map((d) => d.date))}
                  />
                  <button
                    type="button"
                    onClick={exportOverviewCsv}
                    className="btn btn-secondary w-full sm:w-auto"
                    disabled={filteredDayStats.length === 0}
                  >
                    <IconDownload className="h-4 w-4" />
                    Xuất CSV
                  </button>
                </>
              }
            />

            {filteredDayStats.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu doanh thu"
                description="Bắt đầu bằng cách nhập doanh thu cuối ngày"
                action={
                  <button type="button" onClick={() => setTab("revenue")} className="btn btn-primary">
                    <IconPlus className="h-4 w-4" />
                    Nhập doanh thu
                  </button>
                }
              />
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {filteredDayStats.map((d) => (
                    <div key={d.id} className="mobile-record-card">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <p className="font-semibold">
                          <button
                            type="button"
                            onClick={() => void openDayDetail(d)}
                            className="text-left text-indigo-700 hover:underline"
                          >
                            {formatDate(d.date)}
                          </button>
                        </p>
                        <span className="badge badge-gray">{d.employeeCount} NV</span>
                      </div>
                      <dl>
                        <dt>Doanh thu</dt>
                        <dd>{formatCurrency(d.revenue)}</dd>
                        <dt>Tổng lương</dt>
                        <dd className="font-semibold text-emerald-700">{formatCurrency(d.totalSalary)}</dd>
                        <dt>Admin thu</dt>
                        <dd className="font-semibold text-indigo-700">{formatCurrency(d.adminNet)}</dd>
                      </dl>
                      <div className="mt-3">{renderDayStatActions(d)}</div>
                    </div>
                  ))}
                </div>
                <div className="table-wrap hidden md:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Doanh thu</th>
                        <th>Tổng lương</th>
                        <th>Admin thu</th>
                        <th>Số NV</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDayStats.map((d) => (
                        <tr
                          key={d.id}
                          className={(d as { _pending?: boolean })._pending ? "opacity-70" : ""}
                        >
                          <td className="font-medium">
                            <button
                              type="button"
                              onClick={() => void openDayDetail(d)}
                              className="text-left font-medium text-indigo-700 hover:underline"
                            >
                              {formatDate(d.date)}
                            </button>
                          </td>
                          <td>{formatCurrency(d.revenue)}</td>
                          <td className="font-semibold text-emerald-700">{formatCurrency(d.totalSalary)}</td>
                          <td className="font-semibold text-indigo-700">{formatCurrency(d.adminNet)}</td>
                          <td>{d.employeeCount}</td>
                          <td>{renderDayStatActions(d)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "revenue" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={submitRevenue} className="card space-y-4 lg:col-span-2">
            <SectionHeader
              title="Cập nhật doanh thu"
              description="Hệ thống tự tính lương cho nhân viên đang hoạt động theo % hiện tại"
            />
            <div>
              <label className="label" htmlFor="date">Ngày</label>
              <input id="date" type="date" className="input" value={revenueDate} onChange={(e) => setRevenueDate(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="amount">Doanh thu (VNĐ)</label>
              <input id="amount" type="number" min="0" className="input" value={revenueAmount} onChange={(e) => setRevenueAmount(e.target.value)} placeholder="VD: 5.000.000" required />
            </div>
            <div>
              <label className="label" htmlFor="note">Ghi chú (tuỳ chọn)</label>
              <input id="note" className="input" value={revenueNote} onChange={(e) => setRevenueNote(e.target.value)} placeholder="VD: Cuối tuần đông khách" />
            </div>
            <button type="submit" className="btn btn-primary w-full py-3">
              <IconPlus className="h-4 w-4" />
              Lưu doanh thu & tính lương
            </button>
          </form>

          <div className="card lg:col-span-3">
            <SectionHeader title="Lịch sử gần đây" description="5 ngày doanh thu mới nhất" />
            {dayStats.length === 0 ? (
              <EmptyState title="Chưa có doanh thu" description="Nhập doanh thu đầu tiên ở form bên trái" />
            ) : (
              <div className="space-y-2">
                {dayStats.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        <button
                          type="button"
                          onClick={() => void openDayDetail(d)}
                          className="hover:text-indigo-700 hover:underline"
                        >
                          {formatDate(d.date)}
                        </button>
                      </p>
                      <p className="text-xs text-slate-500">
                        Lương {formatCurrency(d.totalSalary)} · Admin {formatCurrency(d.adminNet)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <p className="text-lg font-bold text-indigo-700">{formatCurrency(d.revenue)}</p>
                      {renderDayStatActions(d)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "employees" && (
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="space-y-6 xl:col-span-2">
            <form onSubmit={createEmployee} className="card space-y-4">
              <SectionHeader title="Thêm nhân viên mới" description="Tạo tài khoản đăng nhập và thiết lập % lương" />
              <div>
                <label className="label">Họ tên</label>
                <input className="input" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Tên đăng nhập</label>
                <input className="input" value={newEmployee.username} onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })} required />
              </div>
              <div>
                <label className="label">Mật khẩu</label>
                <input type="password" className="input" value={newEmployee.password} onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })} required />
              </div>
              <div>
                <label className="label">% lương (doanh thu)</label>
                <input type="number" min="0" max="100" step="0.1" className="input" value={newEmployee.salaryPercentage} onChange={(e) => setNewEmployee({ ...newEmployee, salaryPercentage: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary w-full">
                <IconPlus className="h-4 w-4" />
                Tạo nhân viên
              </button>
            </form>

            <div className="card">
              <SectionHeader title={`Danh sách (${filteredEmployees.length})`} />
              <div className="relative mb-3">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-10"
                  placeholder="Tìm theo tên hoặc username..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Không tìm thấy nhân viên</p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => loadEmployeeDetail(emp.id)}
                      className={`flex w-full gap-3 rounded-xl border px-4 py-3 text-left transition hover:shadow-sm sm:items-center ${
                        selectedEmployee?.employee.id === emp.id
                          ? "border-indigo-300 bg-indigo-50/80 ring-1 ring-indigo-200"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <UserAvatar name={emp.name} avatarUrl={emp.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-800">{emp.name}</p>
                          {!emp.isActive && <span className="badge badge-red">Tạm ngưng</span>}
                        </div>
                        <p className="text-sm text-slate-500">@{emp.username} · {emp.salaryPercentage}%</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-bold text-emerald-700">{formatCurrency(emp.totalSalary)}</p>
                        <p className="text-xs text-slate-400">Tổng lương</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-3">
            {selectedEmployee ? (
              <>
                <div className="card">
                  <div className="flex flex-wrap items-start gap-4">
                    <UserAvatar
                      name={selectedEmployee.employee.name}
                      avatarUrl={selectedEmployee.employee.avatarUrl}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900">
                              {selectedEmployee.employee.name}
                            </h2>
                            <span className={`badge ${selectedEmployee.employee.isActive ? "badge-green" : "badge-red"}`}>
                              {selectedEmployee.employee.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">@{selectedEmployee.employee.username}</p>
                        </div>
                        <button type="button" onClick={toggleEmployeeActive} className={`btn ${selectedEmployee.employee.isActive ? "btn-danger" : "btn-primary"}`}>
                          {selectedEmployee.employee.isActive ? "Tạm ngưng" : "Kích hoạt lại"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <StatCard label="Tổng lương" value={selectedEmployee.totalSalary} icon="salary" accent="emerald" />
                    <StatCard label="Tổng doanh thu (đã tính)" value={selectedEmployee.totalRevenue} icon="revenue" accent="indigo" />
                  </div>

                  <form onSubmit={updateEmployeePercentage} className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                    <div className="flex-1">
                      <label className="label">Đổi % lương (từ hôm nay)</label>
                      <input type="number" min="0" max="100" step="0.1" className="input" value={editPercentage} onChange={(e) => setEditPercentage(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-full sm:w-auto sm:self-end">Cập nhật %</button>
                  </form>

                  <form onSubmit={resetEmployeePassword} className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row">
                    <div className="flex-1">
                      <label className="label">Đặt lại mật khẩu</label>
                      <input type="password" className="input" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" />
                    </div>
                    <button type="submit" className="btn btn-secondary w-full sm:w-auto sm:self-end">Đặt lại MK</button>
                  </form>
                </div>

                <div>
                  <SectionHeader
                    title="Lương theo ngày"
                    action={
                      <MonthFilter
                        value={employeeMonth}
                        onChange={setEmployeeMonth}
                        options={getMonthOptions(selectedEmployee.records.map((r) => r.date))}
                      />
                    }
                  />
                  <SalaryTable records={filteredEmployeeRecords} />
                </div>
              </>
            ) : (
              <EmptyState
                title="Chọn nhân viên"
                description="Chọn một nhân viên từ danh sách bên trái để xem chi tiết lương và quản lý tài khoản"
              />
            )}
          </div>
        </div>
      )}

      <Modal
        open={!!editingRevenue}
        onClose={() => setEditingRevenue(null)}
        title="Sửa doanh thu"
        description={
          editingRevenue
            ? `Ngày ${formatDate(editingRevenue.date)} — lương sẽ được tính lại theo % đã khóa`
            : undefined
        }
      >
        {editingRevenue && (
          <form onSubmit={saveEditRevenue} className="space-y-4">
            <div>
              <label className="label">Doanh thu (VNĐ)</label>
              <input type="number" min="0" className="input" value={editingRevenue.amount} onChange={(e) => setEditingRevenue({ ...editingRevenue, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Ghi chú</label>
              <input className="input" value={editingRevenue.note} onChange={(e) => setEditingRevenue({ ...editingRevenue, note: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">Lưu thay đổi</button>
              <button type="button" onClick={() => setEditingRevenue(null)} className="btn btn-secondary flex-1">Hủy</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!viewingDay}
        onClose={closeDayDetail}
        title={viewingDay ? `Chi tiết ngày ${formatDate(viewingDay.date)}` : "Chi tiết ngày"}
        description="Xem doanh thu và cách chia % lương cho từng nhân viên"
      >
        <DayRevenueDetailPanel detail={dayDetail} loading={dayDetailLoading} />
        {!dayDetailLoading && (
          <div className="flex justify-end pt-2">
            <button type="button" onClick={closeDayDetail} className="btn btn-secondary">
              Đóng
            </button>
          </div>
        )}
      </Modal>

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
            username: profileUser.username ?? "admin",
            name: profileUser.name,
            role: profileUser.role,
            avatarUrl: profileUser.avatarUrl,
          }}
          onUpdated={(p) => {
            setProfileUser((prev) => ({ ...prev, name: p.name, avatarUrl: p.avatarUrl }));
            setProfileLoaded(true);
          }}
        />
      )}
      <SyncIndicator syncing={syncing} label={syncDone} />
    </DashboardShell>
  );
}
