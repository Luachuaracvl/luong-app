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
  indigo: { card: "", icon: "stat-icon" },
  violet: { card: "", icon: "stat-icon" },
  emerald: { card: "", icon: "stat-icon" },
  amber: { card: "", icon: "stat-icon" },
  slate: { card: "", icon: "stat-icon" },
  cyan: { card: "", icon: "stat-icon" },
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
