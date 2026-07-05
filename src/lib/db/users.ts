import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { Role, UserDoc } from "@/lib/types";

const COLLECTION = "users";

export async function findUserByUsername(username: string) {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("username", "==", username)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as UserDoc) };
}

export async function findUserById(id: string) {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as UserDoc) };
}

export async function findEmployees() {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("role", "==", "EMPLOYEE")
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as UserDoc) }))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function createUser(data: {
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  salaryPercentage: number;
}) {
  const now = FieldValue.serverTimestamp();
  const ref = await getDb()
    .collection(COLLECTION)
    .add({
      username: data.username,
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role,
      salaryPercentage: data.salaryPercentage,
      isActive: true,
      totalSalary: 0,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });

  const created = await ref.get();
  return { id: created.id, ...(created.data() as UserDoc) };
}

export async function updateUser(
  id: string,
  data: Partial<
    Pick<
      UserDoc,
      "name" | "isActive" | "salaryPercentage" | "passwordHash" | "avatarUrl"
    >
  >
) {
  await getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });

  return findUserById(id);
}

export async function adminExists() {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("role", "==", "ADMIN")
    .limit(1)
    .get();
  return !snap.empty;
}

export async function createAdminUser(passwordHash: string) {
  const exists = await adminExists();
  if (exists) return null;

  return createUser({
    username: "admin",
    passwordHash,
    name: "Quản trị viên",
    role: "ADMIN",
    salaryPercentage: 0,
  });
}

export function userToJson(user: UserDoc & { id: string }) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    salaryPercentage: user.salaryPercentage,
    isActive: user.isActive,
    totalSalary: user.totalSalary ?? 0,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

export { Timestamp };
