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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Quản lý Lương</h1>
            <p className="text-sm text-slate-500">
              Xin chào, {user.name}{" "}
              <span className="badge badge-blue ml-1">
                {user.role === "ADMIN" ? "Admin" : "Nhân viên"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenProfile && (
            <button onClick={onOpenProfile} className="btn btn-secondary">
              Hồ sơ
            </button>
          )}
          <button onClick={logout} className="btn btn-secondary">
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
