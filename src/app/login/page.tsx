"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại");
        return;
      }

      router.push(data.user.role === "ADMIN" ? "/admin" : "/employee");
      router.refresh();
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="relative z-10">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold shadow-lg shadow-indigo-900/40">
            ₫
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Quản lý Lương
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
            Hệ thống tính lương theo phần trăm doanh thu — theo dõi doanh thu,
            lương nhân viên và thu nhập admin trên một nền tảng duy nhất.
          </p>
        </div>

        <div className="relative z-10 mt-10 grid gap-4 sm:grid-cols-3 lg:mt-0">
          {[
            { n: "Doanh thu", d: "Cập nhật cuối ngày, tự tính lương" },
            { n: "Nhân viên", d: "Theo dõi lương & lịch sử chi trả" },
            { n: "Báo cáo", d: "Thống kê, xuất CSV, lọc theo tháng" },
          ].map((item) => (
            <div
              key={item.n}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <p className="font-semibold">{item.n}</p>
              <p className="mt-1 text-xs text-slate-400">{item.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="login-form-area">
        <div className="card-elevated w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Đăng nhập</h2>
            <p className="mt-2 text-sm text-slate-500">
              Nhập tài khoản để truy cập hệ thống
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="username">
                Tên đăng nhập
              </label>
              <input
                id="username"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin hoặc tên nhân viên"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
