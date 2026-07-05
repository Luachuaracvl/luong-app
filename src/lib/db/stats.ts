import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { SystemStatsDoc } from "@/lib/types";

const DOC_PATH = "systemStats/summary";

export async function getGlobalStats(): Promise<SystemStatsDoc> {
  const ref = getDb().doc(DOC_PATH);
  const doc = await ref.get();

  if (doc.exists) {
    return doc.data() as SystemStatsDoc;
  }

  return { totalRevenue: 0, totalSalary: 0, revenueDays: 0 };
}

export async function adjustGlobalStats(delta: {
  totalRevenue?: number;
  totalSalary?: number;
  revenueDays?: number;
}) {
  const ref = getDb().doc(DOC_PATH);
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (delta.totalRevenue) {
    updates.totalRevenue = FieldValue.increment(delta.totalRevenue);
  }
  if (delta.totalSalary) {
    updates.totalSalary = FieldValue.increment(delta.totalSalary);
  }
  if (delta.revenueDays) {
    updates.revenueDays = FieldValue.increment(delta.revenueDays);
  }

  await ref.set(updates, { merge: true });
}

export async function setGlobalStats(stats: SystemStatsDoc) {
  await getDb()
    .doc(DOC_PATH)
    .set({ ...stats, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
