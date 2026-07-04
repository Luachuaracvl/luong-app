import type { SalaryRecordDoc } from "@/lib/types";

type SalaryRecord = SalaryRecordDoc & { id: string };

export function groupSalariesByRevenue(records: SalaryRecord[]) {
  const map = new Map<string, SalaryRecord[]>();
  for (const record of records) {
    const list = map.get(record.dailyRevenueId) ?? [];
    list.push(record);
    map.set(record.dailyRevenueId, list);
  }
  return map;
}

export function groupSalariesByUser(records: SalaryRecord[]) {
  const map = new Map<string, SalaryRecord[]>();
  for (const record of records) {
    const list = map.get(record.userId) ?? [];
    list.push(record);
    map.set(record.userId, list);
  }
  return map;
}

export function sumSalary(records: SalaryRecord[]) {
  return records.reduce((sum, r) => sum + r.salaryAmount, 0);
}
