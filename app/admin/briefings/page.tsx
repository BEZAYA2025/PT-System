import { fetchAdminPendingBriefings } from "@/lib/admin";
import { BriefingsSectionView } from "@/components/admin/BriefingsSectionView";

export const dynamic = "force-dynamic";

export default async function AdminBriefingsPage() {
  const res = await fetchAdminPendingBriefings();
  return <BriefingsSectionView initialPending={res?.briefings ?? null} />;
}
