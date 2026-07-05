import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db/users";
import EmployeeDashboard from "@/components/EmployeeDashboard";

export default async function EmployeePage() {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.role !== "EMPLOYEE") redirect("/admin");

  const dbUser = await findUserById(session.id);

  return (
    <EmployeeDashboard
      user={{
        ...session,
        avatarUrl: dbUser?.avatarUrl ?? null,
      }}
    />
  );
}
