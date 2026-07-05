import { FieldValue, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { ChatMessageDoc, Role } from "@/lib/types";

const COLLECTION = "chatMessages";

function docToMessage(doc: QueryDocumentSnapshot) {
  return { id: doc.id, ...(doc.data() as ChatMessageDoc) };
}

export async function listRecentMessages(roomKey: string, limit = 80) {
  try {
    const snap = await getDb()
      .collection(COLLECTION)
      .where("roomKey", "==", roomKey)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map(docToMessage).reverse();
  } catch {
    const snap = await getDb()
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(150)
      .get();

    return snap.docs
      .map(docToMessage)
      .filter((m) => m.roomKey === roomKey || (!m.roomKey && roomKey === "channel:general"))
      .slice(0, limit)
      .reverse();
  }
}

export async function listMessagesSince(roomKey: string, since: Date, limit = 50) {
  try {
    const snap = await getDb()
      .collection(COLLECTION)
      .where("roomKey", "==", roomKey)
      .where("createdAt", ">", Timestamp.fromDate(since))
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();

    return snap.docs.map(docToMessage);
  } catch {
    return [];
  }
}

export async function listMessagesUpdatedSince(since: Date, roomKey: string, limit = 50) {
  try {
    const snap = await getDb()
      .collection(COLLECTION)
      .where("roomKey", "==", roomKey)
      .where("updatedAt", ">", Timestamp.fromDate(since))
      .orderBy("updatedAt", "asc")
      .limit(limit)
      .get();

    return snap.docs.map(docToMessage);
  } catch {
    return [];
  }
}

export async function findMessageById(messageId: string) {
  const doc = await getDb().collection(COLLECTION).doc(messageId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as ChatMessageDoc) };
}

export async function createMessage(data: {
  senderId: string;
  senderName: string;
  senderRole: Role;
  senderAvatarUrl?: string | null;
  text: string;
  roomKey: string;
  channelId?: string | null;
  dmPeerId?: string | null;
  replyToId?: string | null;
  replyToName?: string | null;
  replyToText?: string | null;
  mentions?: string[];
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
    roomKey: data.roomKey,
    channelId: data.channelId ?? null,
    dmPeerId: data.dmPeerId ?? null,
    replyToId: data.replyToId ?? null,
    replyToName: data.replyToName ?? null,
    replyToText: data.replyToText ?? null,
    mentions: data.mentions ?? [],
    reactions: {},
    edited: false,
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
    roomKey: data.roomKey,
    channelId: data.channelId ?? null,
    dmPeerId: data.dmPeerId ?? null,
    replyToId: data.replyToId ?? null,
    replyToName: data.replyToName ?? null,
    replyToText: data.replyToText ?? null,
    mentions: data.mentions ?? [],
    reactions: {},
    edited: false,
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
  if (data.senderId !== userId) throw new Error("FORBIDDEN");
  if (data.recalled) return { id: doc.id, ...data };

  await ref.update({
    recalled: true,
    text: "",
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  const msg = updated.data() as ChatMessageDoc;
  return { id: updated.id, ...msg, updatedAt: msg.updatedAt ?? Timestamp.now() };
}

export async function editMessage(messageId: string, userId: string, text: string) {
  const ref = getDb().collection(COLLECTION).doc(messageId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as ChatMessageDoc;
  if (data.senderId !== userId) throw new Error("FORBIDDEN");
  if (data.recalled) throw new Error("RECALLED");

  await ref.update({
    text,
    edited: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  const msg = updated.data() as ChatMessageDoc;
  return { id: updated.id, ...msg, updatedAt: msg.updatedAt ?? Timestamp.now() };
}

export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string
) {
  const ref = getDb().collection(COLLECTION).doc(messageId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as ChatMessageDoc;
  if (data.recalled) throw new Error("RECALLED");

  const reactions = { ...(data.reactions ?? {}) };
  const current = reactions[emoji] ?? [];
  if (current.includes(userId)) {
    const next = current.filter((id) => id !== userId);
    if (next.length === 0) delete reactions[emoji];
    else reactions[emoji] = next;
  } else {
    reactions[emoji] = [...current, userId];
  }

  await ref.update({
    reactions,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  const msg = updated.data() as ChatMessageDoc;
  return { id: updated.id, ...msg, updatedAt: msg.updatedAt ?? Timestamp.now() };
}

export function messageToJson(msg: ChatMessageDoc & { id: string }) {
  return {
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    senderAvatarUrl: msg.senderAvatarUrl ?? null,
    text: msg.recalled ? "" : msg.text,
    roomKey: msg.roomKey ?? "channel:general",
    channelId: msg.channelId ?? null,
    dmPeerId: msg.dmPeerId ?? null,
    replyToId: msg.replyToId ?? null,
    replyToName: msg.replyToName ?? null,
    replyToText: msg.replyToText ?? null,
    mentions: msg.mentions ?? [],
    reactions: msg.reactions ?? {},
    edited: msg.edited ?? false,
    recalled: msg.recalled ?? false,
    createdAt: msg.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: msg.updatedAt?.toDate?.()?.toISOString() ?? undefined,
  };
}
