import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import EmployeeDashboard from "@/components/EmployeeDashboard";

export default async function EmployeePage() {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.role !== "EMPLOYEE") redirect("/admin");

  return <EmployeeDashboard user={session} />;
}
