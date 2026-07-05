import type { Timestamp } from "firebase-admin/firestore";

export type Role = "ADMIN" | "EMPLOYEE";

export type UserDoc = {
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  salaryPercentage: number;
  isActive: boolean;
  totalSalary?: number;
  avatarUrl?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type DailyRevenueDoc = {
  dateKey: string;
  date: Timestamp;
  amount: number;
  note: string | null;
  totalSalary?: number;
  employeeCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type SystemStatsDoc = {
  totalRevenue: number;
  totalSalary: number;
  revenueDays: number;
};

export type SalaryRecordDoc = {
  userId: string;
  dailyRevenueId: string;
  dateKey: string;
  percentageUsed: number;
  salaryAmount: number;
  revenueAmount?: number;
  createdAt: Timestamp;
};

export type PercentageHistoryDoc = {
  userId: string;
  percentage: number;
  effectiveFrom: Timestamp;
  createdAt: Timestamp;
};

export type ChatChannelDoc = {
  name: string;
  slug: string;
  description?: string;
  isDefault?: boolean;
  adminOnly?: boolean;
  createdAt: Timestamp;
};

export type ChatMessageDoc = {
  senderId: string;
  senderName: string;
  senderRole: Role;
  senderAvatarUrl?: string | null;
  text: string;
  roomKey: string;
  channelId?: string | null;
  dmPeerId?: string | null;
  replyToId?: string | null;
  replyToName?: string | null;
  replyToText?: string | null;
  mentions?: string[];
  reactions?: Record<string, string[]>;
  edited?: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  recalled?: boolean;
};
