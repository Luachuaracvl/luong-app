import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { DailyRevenueDoc } from "@/lib/types";
import { dateToKey, toDateOnly } from "@/lib/utils";

const COLLECTION = "dailyRevenues";

export async function findRevenueById(id: string) {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as DailyRevenueDoc) };
}

export async function deleteRevenue(id: string) {
  await getDb().collection(COLLECTION).doc(id).delete();
}

export async function findRevenueByDate(date: Date) {
  const dateKey = dateToKey(toDateOnly(date));
  const doc = await getDb().collection(COLLECTION).doc(dateKey).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as DailyRevenueDoc) };
}

export async function upsertRevenue(date: Date, amount: number, note: string | null) {
  const normalized = toDateOnly(date);
  const dateKey = dateToKey(normalized);
  const ref = getDb().collection(COLLECTION).doc(dateKey);
  const existing = await ref.get();
  const now = FieldValue.serverTimestamp();

  if (existing.exists) {
    const prev = existing.data() as DailyRevenueDoc;
    await ref.update({
      amount,
      note,
      updatedAt: now,
    });
    return {
      id: dateKey,
      dateKey,
      date: prev.date,
      amount,
      note,
      totalSalary: prev.totalSalary ?? 0,
      employeeCount: prev.employeeCount ?? 0,
      createdAt: prev.createdAt,
      updatedAt: Timestamp.now(),
      isNew: false,
      previousAmount: prev.amount,
    };
  }

  await ref.set({
    dateKey,
    date: Timestamp.fromDate(normalized),
    amount,
    note,
    totalSalary: 0,
    employeeCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  const docDate = Timestamp.fromDate(normalized);
  return {
    id: dateKey,
    dateKey,
    date: docDate,
    amount,
    note,
    totalSalary: 0,
    employeeCount: 0,
    createdAt: docDate,
    updatedAt: Timestamp.now(),
    isNew: true,
    previousAmount: 0,
  };
}

export async function updateRevenueTotals(
  id: string,
  totalSalary: number,
  employeeCount: number
) {
  await getDb().collection(COLLECTION).doc(id).update({
    totalSalary,
    employeeCount,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function listRevenues(limit = 60) {
  const snap = await getDb()
    .collection(COLLECTION)
    .orderBy("dateKey", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as DailyRevenueDoc),
  }));
}

export function revenueToJson(revenue: DailyRevenueDoc & { id: string }) {
  return {
    id: revenue.id,
    date: revenue.date.toDate().toISOString(),
    amount: revenue.amount,
    note: revenue.note,
  };
}

export { Timestamp };
