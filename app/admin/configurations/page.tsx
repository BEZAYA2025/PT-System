import type { Metadata } from "next";
import { ConfigurationsSectionView } from "@/components/admin/ConfigurationsSectionView";

export const metadata: Metadata = {
  title: "Configurations · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminConfigurationsPage() {
  return <ConfigurationsSectionView />;
}
