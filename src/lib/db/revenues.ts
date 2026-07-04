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

  if (existing.exists) {
    await ref.update({
      amount,
      note,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.set({
      dateKey,
      date: Timestamp.fromDate(normalized),
      amount,
      note,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const updated = await ref.get();
  return { id: updated.id, ...(updated.data() as DailyRevenueDoc) };
}

export async function listRevenues(limit = 60) {
  const snap = await getDb().collection(COLLECTION).get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as DailyRevenueDoc) }))
    .sort((a, b) => b.date.toMillis() - a.date.toMillis())
    .slice(0, limit);
}

export function revenueToJson(revenue: DailyRevenueDoc & { id: string }) {
  return {
    id: revenue.id,
    date: revenue.date.toDate().toISOString(),
    amount: revenue.amount,
    note: revenue.note,
  };
}
