"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  IconChart,
  IconDashboard,
  IconRevenue,
  IconSalary,
  IconUsers,
} from "./Icons";

const ACCENTS = {
  indigo: "from-indigo-500/10 to-indigo-600/5 border-indigo-100",
  emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-100",
  amber: "from-amber-500/10 to-amber-600/5 border-amber-100",
  slate: "from-slate-500/10 to-slate-600/5 border-slate-100",
} as const;

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
  accent = "slate",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  format?: "currency" | "number" | "text";
  accent?: keyof typeof ACCENTS;
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
    <div className={`stat-card bg-gradient-to-br ${ACCENTS[accent]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="stat-label">{label}</p>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-indigo-600 shadow-sm">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="stat-value mt-2">{display}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
