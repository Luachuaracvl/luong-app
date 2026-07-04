import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { PercentageHistoryDoc } from "@/lib/types";
import { toDateOnly } from "@/lib/utils";

const COLLECTION = "percentageHistory";

export async function createPercentageHistory(
  userId: string,
  percentage: number,
  effectiveFrom: Date
) {
  const ref = await getDb()
    .collection(COLLECTION)
    .add({
      userId,
      percentage,
      effectiveFrom: Timestamp.fromDate(toDateOnly(effectiveFrom)),
      createdAt: FieldValue.serverTimestamp(),
    });

  const created = await ref.get();
  return { id: created.id, ...(created.data() as PercentageHistoryDoc) };
}

export async function findPercentageHistoryByUser(userId: string) {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as PercentageHistoryDoc) }))
    .sort((a, b) => b.effectiveFrom.toMillis() - a.effectiveFrom.toMillis());
}

export async function getPercentageForDate(userId: string, date: Date) {
  const target = toDateOnly(date).getTime();
  const history = await findPercentageHistoryByUser(userId);

  const match = history.find((h) => h.effectiveFrom.toMillis() <= target);
  return match?.percentage;
}
