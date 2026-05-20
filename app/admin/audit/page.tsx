import type { Metadata } from "next";
import { AuditLogView } from "@/components/admin/AuditLogView";

export const metadata: Metadata = {
  title: "Audit Log · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminAuditPage() {
  return <AuditLogView />;
}
