import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { resolvePresence, type PresenceInfo } from "@/lib/presence";
import type { Role } from "@/lib/types";

const COLLECTION = "userPresence";

export type UserPresenceDoc = {
  userId: string;
  name: string;
  role: Role;
  lastSeenAt: Timestamp;
  online?: boolean;
};

function timestampToIso(value?: Timestamp | null): string | null {
  return value?.toDate?.()?.toISOString() ?? null;
}

export async function touchPresence(userId: string, name: string, role: Role) {
  await getDb()
    .collection(COLLECTION)
    .doc(userId)
    .set(
      {
        userId,
        name,
        role,
        online: true,
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export async function markPresenceOffline(userId: string) {
  await getDb()
    .collection(COLLECTION)
    .doc(userId)
    .set(
      {
        userId,
        online: false,
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export async function getAllPresence(): Promise<Map<string, PresenceInfo>> {
  const snap = await getDb().collection(COLLECTION).get();
  const map = new Map<string, PresenceInfo>();

  for (const doc of snap.docs) {
    const data = doc.data() as UserPresenceDoc;
    const lastSeenAt = timestampToIso(data.lastSeenAt);
    map.set(doc.id, resolvePresence(lastSeenAt, data.online));
  }

  return map;
}

export function presenceMapToJson(map: Map<string, PresenceInfo>) {
  return Object.fromEntries(map.entries());
}
