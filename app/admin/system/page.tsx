import type { Metadata } from "next";
import { SystemSectionView } from "@/components/admin/SystemSectionView";

export const metadata: Metadata = {
  title: "System · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminSystemPage() {
  return <SystemSectionView />;
}
