"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  IconChart,
  IconDashboard,
  IconRevenue,
  IconSalary,
  IconUsers,
} from "./Icons";

const ICONS = {
  revenue: IconRevenue,
  salary: IconSalary,
  users: IconUsers,
  chart: IconChart,
  dashboard: IconDashboard,
} as const;

const ACCENT_CLASS = {
  indigo: { card: "stat-card-violet", icon: "stat-icon-violet" },
  violet: { card: "stat-card-violet", icon: "stat-icon-violet" },
  emerald: { card: "stat-card-emerald", icon: "stat-icon-emerald" },
  amber: { card: "stat-card-amber", icon: "stat-icon-amber" },
  slate: { card: "stat-card-cyan", icon: "stat-icon-cyan" },
  cyan: { card: "stat-card-cyan", icon: "stat-icon-cyan" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  format = "currency",
  accent = "slate",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  format?: "currency" | "number" | "text";
  accent?: keyof typeof ACCENT_CLASS;
  icon?: keyof typeof ICONS;
}) {
  const display =
    typeof value === "number"
      ? format === "currency"
        ? formatCurrency(value)
        : formatNumber(value)
      : value;

  const Icon = icon ? ICONS[icon] : null;
  const styles = ACCENT_CLASS[accent] ?? ACCENT_CLASS.slate;

  return (
    <div className={`stat-card ${styles.card}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="stat-label">{label}</p>
        {Icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${styles.icon}`}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="stat-value mt-2">{display}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
