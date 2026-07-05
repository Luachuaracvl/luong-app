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

export async function createMessage(data: {
  senderId: string;
  senderName: string;
  senderRole: Role;
  senderAvatarUrl?: string | null;
  text: string;
}) {
  const ref = await getDb()
    .collection(COLLECTION)
    .add({
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      senderAvatarUrl: data.senderAvatarUrl ?? null,
      text: data.text,
      createdAt: FieldValue.serverTimestamp(),
    });

  const created = await ref.get();
  const msg = created.data() as ChatMessageDoc;
  return {
    id: created.id,
    ...msg,
    createdAt: msg.createdAt ?? Timestamp.now(),
  };
}

export function messageToJson(msg: ChatMessageDoc & { id: string }) {
  return {
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    senderAvatarUrl: msg.senderAvatarUrl ?? null,
    text: msg.text,
    createdAt: msg.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}
