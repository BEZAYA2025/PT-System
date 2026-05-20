import type { Metadata } from "next";
import { BusinessSectionView } from "@/components/admin/BusinessSectionView";

export const metadata: Metadata = {
  title: "Business · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminBusinessPage() {
  return <BusinessSectionView />;
}
