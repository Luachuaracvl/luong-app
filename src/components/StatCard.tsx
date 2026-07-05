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

export function StatCard({
  label,
  value,
  hint,
  format = "currency",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  format?: "currency" | "number" | "text";
  accent?: string;
  icon?: keyof typeof ICONS;
}) {
  const display =
    typeof value === "number"
      ? format === "currency"
        ? formatCurrency(value)
        : formatNumber(value)
      : value;

  const Icon = icon ? ICONS[icon] : null;

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-2">
        <p className="stat-label">{label}</p>
        {Icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
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
