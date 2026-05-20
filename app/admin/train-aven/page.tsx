import type { Metadata } from "next";
import { TrainAvenSectionView } from "@/components/admin/TrainAvenSectionView";

export const metadata: Metadata = {
  title: "Train Aven · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminTrainAvenPage() {
  return <TrainAvenSectionView />;
}
