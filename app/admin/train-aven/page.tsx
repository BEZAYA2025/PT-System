import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { TrainAvenSectionView } from "@/components/admin/TrainAvenSectionView";

export const metadata: Metadata = {
  title: "Train Aven · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminTrainAvenPage() {
  // Founder id needed for the conversations history fetch
  // (ADMIN_API_SPEC §30 — ?member_id=<founder>). The admin layout
  // already gates non-founders; here we just need the id to thread
  // through to the client TrainStudio.
  const user = await requireUser();
  return <TrainAvenSectionView founderId={user.id} />;
}
