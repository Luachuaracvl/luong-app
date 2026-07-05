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

  return { id: ref.id, userId, percentage, effectiveFrom: Timestamp.fromDate(toDateOnly(effectiveFrom)) };
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

export async function findPercentageHistoryForUsers(userIds: string[]) {
  const map = new Map<string, Awaited<ReturnType<typeof findPercentageHistoryByUser>>>();

  if (userIds.length === 0) return map;

  const db = getDb();
  for (let i = 0; i < userIds.length; i += 30) {
    const chunk = userIds.slice(i, i + 30);
    const snap = await db
      .collection(COLLECTION)
      .where("userId", "in", chunk)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as PercentageHistoryDoc;
      const list = map.get(data.userId) ?? [];
      list.push({ id: doc.id, ...data });
      map.set(data.userId, list);
    }
  }

  for (const [userId, list] of map) {
    map.set(
      userId,
      list.sort((a, b) => b.effectiveFrom.toMillis() - a.effectiveFrom.toMillis())
    );
  }

  return map;
}

export async function getPercentageForDate(userId: string, date: Date) {
  const target = toDateOnly(date).getTime();
  const history = await findPercentageHistoryByUser(userId);

  const match = history.find((h) => h.effectiveFrom.toMillis() <= target);
  return match?.percentage;
}
