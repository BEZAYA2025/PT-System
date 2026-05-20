import type { Metadata } from "next";
import { AvenSectionView } from "@/components/admin/AvenSectionView";

export const metadata: Metadata = {
  title: "Aven Insights · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminAvenPage() {
  return <AvenSectionView />;
}
