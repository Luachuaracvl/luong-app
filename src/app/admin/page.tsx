import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db/users";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/employee");

  const dbUser = await findUserById(session.id);

  return (
    <AdminDashboard
      user={{
        ...session,
        avatarUrl: dbUser?.avatarUrl ?? null,
      }}
    />
  );
}
