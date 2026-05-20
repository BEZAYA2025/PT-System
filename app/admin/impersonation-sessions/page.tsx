import type { Metadata } from "next";
import { fetchAdminImpersonationSessions } from "@/lib/admin";
import { ImpersonationSessionsView } from "@/components/admin/ImpersonationSessionsView";

export const metadata: Metadata = {
  title: "Impersonation Sessions · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminImpersonationSessionsPage() {
  const sessions = await fetchAdminImpersonationSessions();
  return <ImpersonationSessionsView initialSessions={sessions ?? null} />;
}
