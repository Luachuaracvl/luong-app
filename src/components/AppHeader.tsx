"use client";

import { useRouter } from "next/navigation";
import { UserAvatar } from "./UserAvatar";

type User = {
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  avatarUrl?: string | null;
};

export function AppHeader({
  user,
  onOpenProfile,
}: {
  user: User;
  onOpenProfile?: () => void;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
              Quản lý Lương
            </h1>
            <p className="truncate text-xs text-slate-500 sm:text-sm">
              Xin chào, {user.name}{" "}
              <span className="badge badge-blue ml-1">
                {user.role === "ADMIN" ? "Admin" : "Nhân viên"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-auto">
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="btn btn-secondary flex-1 sm:flex-none"
            >
              Hồ sơ
            </button>
          )}
          <button
            onClick={logout}
            className="btn btn-secondary flex-1 sm:flex-none"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
