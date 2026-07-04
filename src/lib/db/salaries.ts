import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { SalaryRecordDoc } from "@/lib/types";

const COLLECTION = "salaryRecords";

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

  const created = await ref.get();
  return { id: created.id, ...(created.data() as SalaryRecordDoc) };
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

export async function updateSalaryRecord(
  id: string,
  data: Partial<Pick<SalaryRecordDoc, "salaryAmount" | "revenueAmount">>
) {
  await getDb().collection(COLLECTION).doc(id).update(data);
}

export async function deleteSalariesByRevenue(dailyRevenueId: string) {
  const records = await findSalaryRecordsByRevenue(dailyRevenueId);
  await Promise.all(
    records.map((record) =>
      getDb().collection(COLLECTION).doc(record.id).delete()
    )
  );
}

export async function getAllSalaryRecords() {
  const snap = await getDb().collection(COLLECTION).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as SalaryRecordDoc),
  }));
}

export async function countSalaryRecordsByUser(userId: string) {
  const records = await findSalaryRecordsByUser(userId);
  return records.length;
}
