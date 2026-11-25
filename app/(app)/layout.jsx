import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <Sidebar user={{ full_name: user.full_name, role: user.role, photo: user.photo }} />
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
