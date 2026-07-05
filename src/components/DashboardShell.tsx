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
  showSubtitleOnMobile,
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
  showSubtitleOnMobile?: boolean;
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
            <div className="login-logo text-base">₫</div>
            <div>
              <p className="font-semibold leading-tight text-fg">Quản lý Lương</p>
              <p className="text-xs text-subtle">
                {user.role === "ADMIN" ? "Quản trị" : "Nhân viên"}
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
              className="sidebar-link w-full text-danger hover:text-danger"
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
                <h1 className="topbar-title">
                  {pageTitle}
                </h1>
                {pageSubtitle && (
                  <p
                    className={`topbar-subtitle ${
                      showSubtitleOnMobile ? "topbar-subtitle-show" : ""
                    }`}
                  >
                    {pageSubtitle}
                  </p>
                )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 lg:hidden">
                    <button
                      type="button"
                      onClick={logout}
                      className="btn btn-secondary flex h-11 w-11 items-center justify-center p-0"
                      aria-label="Đăng xuất"
                      title="Đăng xuất"
                    >
                      <IconLogout className="h-5 w-5" />
                    </button>
                    <UserAvatar
                      name={user.name}
                      avatarUrl={user.avatarUrl}
                      userId={user.id}
                      size="sm"
                    />
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

          <main
            className={fullBleed ? "page-content page-content-full" : "page-content"}
          >
            {children}
          </main>
        </div>

        <nav className="bottom-nav" data-bottom-nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`bottom-nav-link ${
                activeTab === item.id ? "bottom-nav-link-active" : ""
              }`}
            >
              <span className="h-5 w-5 opacity-80">{item.icon}</span>
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
    <div
      className="sidebar-user-card"
    >
      <div className="relative shrink-0">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} userId={user.id} size="sm" />
        <OnlineDot
          userId={user.id}
          online={presence.online}
          className="absolute bottom-0 right-0 h-2.5 w-2.5"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{user.name}</p>
        <p className="truncate text-xs text-subtle">
          {user.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
          {" · "}
          {presence.online ? "Online" : "Offline"}
        </p>
      </div>
    </div>
  );
}
