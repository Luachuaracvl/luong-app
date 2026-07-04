import type { Timestamp } from "firebase-admin/firestore";

export type Role = "ADMIN" | "EMPLOYEE";

export type UserDoc = {
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  salaryPercentage: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type DailyRevenueDoc = {
  dateKey: string;
  date: Timestamp;
  amount: number;
  note: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type SalaryRecordDoc = {
  userId: string;
  dailyRevenueId: string;
  dateKey: string;
  percentageUsed: number;
  salaryAmount: number;
  createdAt: Timestamp;
};

export type PercentageHistoryDoc = {
  userId: string;
  percentage: number;
  effectiveFrom: Timestamp;
  createdAt: Timestamp;
};
