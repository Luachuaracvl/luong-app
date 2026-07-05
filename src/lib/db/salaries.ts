import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { SalaryRecordDoc } from "@/lib/types";

const COLLECTION = "salaryRecords";
const BATCH_SIZE = 400;

type SalaryRecord = SalaryRecordDoc & { id: string };

export async function findSalaryRecord(userId: string, dailyRevenueId: string) {
  const docId = `${userId}_${dailyRevenueId}`;
  const doc = await getDb().collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as SalaryRecordDoc) };
}

export async function createSalaryRecord(data: {
  userId: string;
  dailyRevenueId: string;
  dateKey: string;
  percentageUsed: number;
  salaryAmount: number;
  revenueAmount?: number;
}) {
  const docId = `${data.userId}_${data.dailyRevenueId}`;
  const ref = getDb().collection(COLLECTION).doc(docId);

  await ref.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: docId, ...data } as SalaryRecord;
}

export async function findSalaryRecordsByUser(userId: string) {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as SalaryRecordDoc),
  }));
}

export async function findSalaryRecordsByRevenue(dailyRevenueId: string) {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("dailyRevenueId", "==", dailyRevenueId)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as SalaryRecordDoc),
  }));
}

export async function getSalaryRecordsForRevenueIds(revenueIds: string[]) {
  if (revenueIds.length === 0) return [] as SalaryRecord[];

  const db = getDb();
  const results: SalaryRecord[] = [];

  for (let i = 0; i < revenueIds.length; i += 30) {
    const chunk = revenueIds.slice(i, i + 30);
    const snap = await db
      .collection(COLLECTION)
      .where("dailyRevenueId", "in", chunk)
      .get();
    results.push(
      ...snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as SalaryRecordDoc),
      }))
    );
  }

  return results;
}

export async function updateSalaryRecord(
  id: string,
  data: Partial<Pick<SalaryRecordDoc, "salaryAmount" | "revenueAmount">>
) {
  await getDb().collection(COLLECTION).doc(id).update(data);
}

export async function batchUpdateSalaryRecords(
  updates: { id: string; salaryAmount: number; revenueAmount: number }[]
) {
  if (updates.length === 0) return;

  const db = getDb();
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const item of updates.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection(COLLECTION).doc(item.id), {
        salaryAmount: item.salaryAmount,
        revenueAmount: item.revenueAmount,
      });
    }
    await batch.commit();
  }
}

export async function batchCreateSalaryRecordsWithUserTotals(
  records: {
    userId: string;
    dailyRevenueId: string;
    dateKey: string;
    percentageUsed: number;
    salaryAmount: number;
    revenueAmount: number;
  }[]
) {
  if (records.length === 0) return;

  const db = getDb();
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const record of records.slice(i, i + BATCH_SIZE)) {
      const docId = `${record.userId}_${record.dailyRevenueId}`;
      batch.set(db.collection(COLLECTION).doc(docId), {
        ...record,
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.update(db.collection("users").doc(record.userId), {
        totalSalary: FieldValue.increment(record.salaryAmount),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

export async function batchAdjustUserSalaryTotals(
  deltas: { userId: string; delta: number }[]
) {
  if (deltas.length === 0) return;

  const db = getDb();
  for (let i = 0; i < deltas.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { userId, delta } of deltas.slice(i, i + BATCH_SIZE)) {
      if (delta === 0) continue;
      batch.update(db.collection("users").doc(userId), {
        totalSalary: FieldValue.increment(delta),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

export async function deleteSalariesByRevenue(dailyRevenueId: string) {
  const records = await findSalaryRecordsByRevenue(dailyRevenueId);
  if (records.length === 0) return records;

  const db = getDb();
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const record of records.slice(i, i + BATCH_SIZE)) {
      batch.delete(db.collection(COLLECTION).doc(record.id));
      batch.update(db.collection("users").doc(record.userId), {
        totalSalary: FieldValue.increment(-record.salaryAmount),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  return records;
}

/** @deprecated Prefer scoped queries. Kept for one-time backfill only. */
export async function getAllSalaryRecords() {
  const snap = await getDb().collection(COLLECTION).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as SalaryRecordDoc),
  }));
}

export async function countSalaryRecordsByUser(userId: string) {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .count()
    .get();
  return snap.data().count;
}
