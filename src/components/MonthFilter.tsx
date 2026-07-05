"use client";

import { formatMonthLabel } from "@/lib/utils";

export function MonthFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
      <label className="text-sm text-slate-600">Lọc tháng:</label>
      <select
        className="input w-full py-2 sm:max-w-[180px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">Tất cả</option>
        {options.map((m) => (
          <option key={m} value={m}>
            {formatMonthLabel(m)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function getMonthOptions(dates: string[]): string[] {
  const set = new Set<string>();
  for (const d of dates) {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    set.add(`${y}-${m}`);
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function filterByMonth<T extends { date: string }>(
  records: T[],
  monthKey: string
): T[] {
  if (monthKey === "all") return records;
  return records.filter((r) => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return key === monthKey;
  });
}
