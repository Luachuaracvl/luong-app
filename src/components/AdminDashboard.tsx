"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "./AppHeader";
import { SalaryTable } from "./SalaryTable";
import { StatCard } from "./StatCard";
import { dateToInputValue, formatCurrency, formatDate } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
};

type Employee = {
  id: string;
  username: string;
  name: string;
  salaryPercentage: number;
  isActive: boolean;
  totalSalary: number;
};

type DayStat = {
  id: string;
  date: string;
  revenue: number;
  totalSalary: number;
  employeeCount: number;
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

type Tab = "overview" | "revenue" | "employees";

export default function AdminDashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState({
    totalRevenue: 0,
    totalSalary: 0,
    employeeCount: 0,
    revenueDays: 0,
  });
  const [dayStats, setDayStats] = useState<DayStat[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(
    null
  );
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

  const loadData = useCallback(async () => {
    const [statsRes, revenueRes, employeesRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/revenue"),
      fetch("/api/admin/employees"),
    ]);

    if (statsRes.ok) setOverview(await statsRes.json());
    if (revenueRes.ok) {
      const data = await revenueRes.json();
      setDayStats(data.stats);
    }
    if (employeesRes.ok) {
      const data = await employeesRes.json();
      setEmployees(data.employees);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function submitRevenue(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    const res = await fetch("/api/admin/revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: revenueDate,
        amount: Number(revenueAmount),
        note: revenueNote,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Cập nhật thất bại");
      return;
    }

    setMessage(data.message);
    setRevenueAmount("");
    setRevenueNote("");
    await loadData();
    if (selectedEmployee) {
      await loadEmployeeDetail(selectedEmployee.employee.id);
    }
  }

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newEmployee,
        salaryPercentage: Number(newEmployee.salaryPercentage),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Tạo nhân viên thất bại");
      return;
    }

    setMessage(`Đã tạo nhân viên ${data.employee.name}`);
    setNewEmployee({
      username: "",
      password: "",
      name: "",
      salaryPercentage: "10",
    });
    await loadData();
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

    const res = await fetch(
      `/api/admin/employees/${selectedEmployee.employee.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaryPercentage: Number(editPercentage),
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Cập nhật thất bại");
      return;
    }

    setMessage(
      "Đã cập nhật phần trăm lương. Lương đã tính trước đó không thay đổi."
    );
    await loadEmployeeDetail(selectedEmployee.employee.id);
    await loadData();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Tổng quan" },
    { id: "revenue", label: "Cập nhật doanh thu" },
    { id: "employees", label: "Nhân viên" },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn ${
                tab === t.id ? "btn-primary" : "btn-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {message && (
          <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Tổng doanh thu" value={overview.totalRevenue} />
              <StatCard label="Tổng lương đã trả" value={overview.totalSalary} />
              <StatCard
                label="Số nhân viên"
                value={overview.employeeCount}
                format="number"
                hint="đang hoạt động"
              />
              <StatCard
                label="Số ngày có doanh thu"
                value={overview.revenueDays}
                format="number"
              />
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Thống kê doanh thu & lương theo ngày
              </h2>
              {dayStats.length === 0 ? (
                <div className="card text-slate-500">
                  Chưa có dữ liệu doanh thu.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Doanh thu</th>
                        <th>Tổng lương</th>
                        <th>Số NV được tính</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayStats.map((d) => (
                        <tr key={d.id}>
                          <td>{formatDate(d.date)}</td>
                          <td>{formatCurrency(d.revenue)}</td>
                          <td className="font-semibold text-emerald-700">
                            {formatCurrency(d.totalSalary)}
                          </td>
                          <td>{d.employeeCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "revenue" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={submitRevenue} className="card space-y-4">
              <h2 className="text-lg font-semibold">Cập nhật doanh thu cuối ngày</h2>
              <p className="text-sm text-slate-500">
                Hệ thống sẽ tự tính lương cho tất cả nhân viên theo % hiện tại.
                Lương đã tính trước đó sẽ không bị thay đổi khi bạn sửa % sau này.
              </p>

              <div>
                <label className="label" htmlFor="date">
                  Ngày
                </label>
                <input
                  id="date"
                  type="date"
                  className="input"
                  value={revenueDate}
                  onChange={(e) => setRevenueDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="amount">
                  Doanh thu (VNĐ)
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  className="input"
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(e.target.value)}
                  placeholder="VD: 5000000"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="note">
                  Ghi chú (tuỳ chọn)
                </label>
                <input
                  id="note"
                  className="input"
                  value={revenueNote}
                  onChange={(e) => setRevenueNote(e.target.value)}
                  placeholder="VD: Cuối tuần đông khách"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full">
                Lưu doanh thu & tính lương
              </button>
            </form>

            <div className="card">
              <h3 className="mb-4 font-semibold">5 ngày gần nhất</h3>
              <div className="space-y-3">
                {dayStats.slice(0, 5).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{formatDate(d.date)}</p>
                      <p className="text-sm text-slate-500">
                        Lương: {formatCurrency(d.totalSalary)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(d.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "employees" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <form onSubmit={createEmployee} className="card space-y-4">
                <h2 className="text-lg font-semibold">Tạo tài khoản nhân viên</h2>

                <div>
                  <label className="label">Họ tên</label>
                  <input
                    className="input"
                    value={newEmployee.name}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="label">Tên đăng nhập</label>
                  <input
                    className="input"
                    value={newEmployee.username}
                    onChange={(e) =>
                      setNewEmployee({
                        ...newEmployee,
                        username: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="label">Mật khẩu</label>
                  <input
                    type="password"
                    className="input"
                    value={newEmployee.password}
                    onChange={(e) =>
                      setNewEmployee({
                        ...newEmployee,
                        password: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="label">% lương (doanh thu)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="input"
                    value={newEmployee.salaryPercentage}
                    onChange={(e) =>
                      setNewEmployee({
                        ...newEmployee,
                        salaryPercentage: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-full">
                  Tạo nhân viên
                </button>
              </form>

              <div className="card">
                <h3 className="mb-4 font-semibold">Danh sách nhân viên</h3>
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => loadEmployeeDetail(emp.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition hover:bg-slate-50 ${
                        selectedEmployee?.employee.id === emp.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-sm text-slate-500">
                          @{emp.username} · {emp.salaryPercentage}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700">
                          {formatCurrency(emp.totalSalary)}
                        </p>
                        <p className="text-xs text-slate-400">Tổng lương</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {selectedEmployee ? (
                <>
                  <div className="card">
                    <h2 className="text-lg font-semibold">
                      {selectedEmployee.employee.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      @{selectedEmployee.employee.username}
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <StatCard
                        label="Tổng lương"
                        value={selectedEmployee.totalSalary}
                      />
                      <StatCard
                        label="Tổng doanh thu (các ngày đã tính)"
                        value={selectedEmployee.totalRevenue}
                      />
                    </div>

                    <form
                      onSubmit={updateEmployeePercentage}
                      className="mt-4 flex gap-3"
                    >
                      <div className="flex-1">
                        <label className="label">Đổi % lương (từ hôm nay)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="input"
                          value={editPercentage}
                          onChange={(e) => setEditPercentage(e.target.value)}
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary self-end"
                      >
                        Cập nhật
                      </button>
                    </form>
                  </div>

                  <div>
                    <h3 className="mb-3 font-semibold">Lương theo ngày</h3>
                    <SalaryTable records={selectedEmployee.records} />
                  </div>
                </>
              ) : (
                <div className="card text-center text-slate-500">
                  Chọn một nhân viên để xem chi tiết lương
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
