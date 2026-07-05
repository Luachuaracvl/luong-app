import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { ChatMessageDoc, Role } from "@/lib/types";

const COLLECTION = "chatMessages";

export async function listRecentMessages(limit = 50) {
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

export async function createMessage(data: {
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
}) {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc();
  const createdAt = Timestamp.now();

  await ref.set({
    senderId: data.senderId,
    senderName: data.senderName,
    senderRole: data.senderRole,
    text: data.text,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    id: ref.id,
    senderId: data.senderId,
    senderName: data.senderName,
    senderRole: data.senderRole,
    text: data.text,
    createdAt,
  };
}

export function messageToJson(msg: ChatMessageDoc & { id: string }) {
  return {
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    text: msg.text,
    createdAt: msg.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}
