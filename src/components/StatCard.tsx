"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  format = "currency",
}: {
  label: string;
  value: string | number;
  hint?: string;
  format?: "currency" | "number" | "text";
}) {
  const display =
    typeof value === "number"
      ? format === "currency"
        ? formatCurrency(value)
        : formatNumber(value)
      : value;

  return (
    <div className="card">
      <p className="stat-label">{label}</p>
      <p className="stat-value mt-2">{display}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
