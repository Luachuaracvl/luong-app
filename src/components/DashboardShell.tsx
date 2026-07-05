"use client";

import { useRouter } from "next/navigation";
import { OnlineDot } from "./OnlineStatus";
import { PresenceProvider, usePresence } from "./PresenceProvider";
import { UserAvatar } from "./UserAvatar";
import { IconLogout } from "./Icons";

export type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortLabel?: string;
};

type User = {
  id?: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  avatarUrl?: string | null;
};

export function DashboardShell({
  user,
  navItems,
  activeTab,
  onTabChange,
  pageTitle,
  pageSubtitle,
  children,
  headerAction,
  fullBleed,
}: {
  user: User;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  pageTitle: string;
  pageSubtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  fullBleed?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <PresenceProvider userId={user.id}>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold">
            ₫
          </div>
          <div>
            <p className="font-semibold leading-tight">Quản lý Lương</p>
            <p className="text-xs text-slate-400">
              {user.role === "ADMIN" ? "Bảng điều khiển" : "Nhân viên"}
            </p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`sidebar-link ${
                activeTab === item.id ? "sidebar-link-active" : ""
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <SidebarUserCard user={user} />
          <button
            type="button"
            onClick={logout}
            className="sidebar-link w-full text-red-300 hover:bg-red-950/40 hover:text-red-200"
          >
            <IconLogout className="h-5 w-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className={`main-area ${fullBleed ? "main-area-full" : ""}`}>
        {!fullBleed && (
        <header className="topbar">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                  {pageTitle}
                </h1>
                {pageSubtitle && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{pageSubtitle}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition active:bg-red-50 active:text-red-600"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <IconLogout className="h-5 w-5" />
                </button>
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} userId={user.id} size="sm" />
              </div>
              {headerAction && (
                <div className="hidden shrink-0 sm:block">{headerAction}</div>
              )}
            </div>
            {headerAction && (
              <div className="sm:hidden [&_.btn]:w-full">{headerAction}</div>
            )}
          </div>
        </header>
        )}

        <main className={fullBleed ? "page-content page-content-full" : "page-content"}>
          {children}
        </main>
      </div>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`bottom-nav-link ${
              activeTab === item.id ? "bottom-nav-link-active" : ""
            }`}
          >
            <span className="h-5 w-5">{item.icon}</span>
            <span>{item.shortLabel ?? item.label}</span>
          </button>
        ))}
      </nav>
    </div>
    </PresenceProvider>
  );
}

function SidebarUserCard({ user }: { user: User }) {
  const presence = usePresence(user.id);

  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2.5">
      <div className="relative shrink-0">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} userId={user.id} size="sm" />
        <OnlineDot
          userId={user.id}
          online={presence.online}
          className="absolute bottom-0 right-0 h-2.5 w-2.5"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-slate-400">
          {user.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
          {" · "}
          {presence.online ? "Online" : "Offline"}
        </p>
      </div>
    </div>
  );
}
