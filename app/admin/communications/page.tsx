import type { Metadata } from "next";
import { CommunicationsSectionView } from "@/components/admin/CommunicationsSectionView";

export const metadata: Metadata = {
  title: "Communications · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminCommunicationsPage() {
  return <CommunicationsSectionView />;
}
