import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { ChatMessageDoc, Role } from "@/lib/types";

const COLLECTION = "chatMessages";

export async function listRecentMessages(limit = 80) {
  const snap = await getDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as ChatMessageDoc) }))
    .reverse();
}

export async function listMessagesSince(since: Date, limit = 50) {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("createdAt", ">", Timestamp.fromDate(since))
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as ChatMessageDoc),
  }));
}

export async function listMessagesUpdatedSince(since: Date, limit = 50) {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("updatedAt", ">", Timestamp.fromDate(since))
    .orderBy("updatedAt", "asc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as ChatMessageDoc),
  }));
}

export async function createMessage(data: {
  senderId: string;
  senderName: string;
  senderRole: Role;
  senderAvatarUrl?: string | null;
  text: string;
}) {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc();
  const createdAt = Timestamp.now();

  await ref.set({
    senderId: data.senderId,
    senderName: data.senderName,
    senderRole: data.senderRole,
    senderAvatarUrl: data.senderAvatarUrl ?? null,
    text: data.text,
    recalled: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    id: ref.id,
    senderId: data.senderId,
    senderName: data.senderName,
    senderRole: data.senderRole,
    senderAvatarUrl: data.senderAvatarUrl ?? null,
    text: data.text,
    recalled: false,
    createdAt,
    updatedAt: createdAt,
  };
}

export async function recallMessage(messageId: string, userId: string) {
  const ref = getDb().collection(COLLECTION).doc(messageId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as ChatMessageDoc;
  if (data.senderId !== userId) {
    throw new Error("FORBIDDEN");
  }
  if (data.recalled) {
    return { id: doc.id, ...data };
  }

  await ref.update({
    recalled: true,
    text: "",
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  const msg = updated.data() as ChatMessageDoc;
  return {
    id: updated.id,
    ...msg,
    updatedAt: msg.updatedAt ?? Timestamp.now(),
  };
}

export function messageToJson(msg: ChatMessageDoc & { id: string }) {
  return {
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    senderAvatarUrl: msg.senderAvatarUrl ?? null,
    text: msg.recalled ? "" : msg.text,
    recalled: msg.recalled ?? false,
    createdAt: msg.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: msg.updatedAt?.toDate?.()?.toISOString() ?? undefined,
  };
}
