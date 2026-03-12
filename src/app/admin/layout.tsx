import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, ADMIN_EMAIL } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const email = (session?.user?.email ?? "").toLowerCase();
  if (!session || email !== ADMIN_EMAIL) {
    redirect("/");
  }
  return <>{children}</>;
}

