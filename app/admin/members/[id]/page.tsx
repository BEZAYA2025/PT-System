import { notFound } from "next/navigation";
import {
  fetchAdminMemberDetail,
  fetchAdminMemberLoginHistory,
} from "@/lib/admin";
import { MemberDetailView } from "@/components/admin/MemberDetailView";

export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Fan the two we need for the Overview tab in parallel — the Activity
  // tab will reuse the same login-history payload so we may as well
  // SSR-prime it now rather than waiting for a client-side fetch when
  // the user clicks into that tab.
  const [member, loginHistory] = await Promise.all([
    fetchAdminMemberDetail(id),
    fetchAdminMemberLoginHistory(id, { days: 30, limit: 100 }),
  ]);

  if (!member) notFound();

  return (
    <MemberDetailView member={member} loginHistory={loginHistory ?? []} />
  );
}
