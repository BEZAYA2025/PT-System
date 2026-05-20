import { notFound } from "next/navigation";
import {
  fetchAdminMemberDetail,
  fetchAdminMemberEvents,
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
  // Events drives the Overview timeline (preferred — merges login,
  // trade, Aven, brief signals). Login history still lands SSR so the
  // Activity tab paints instantly when the user clicks into it, and
  // doubles as a fallback for Overview if events comes back empty
  // (older deploys, pre-event-feed members).
  const [member, events, loginHistory] = await Promise.all([
    fetchAdminMemberDetail(id),
    fetchAdminMemberEvents(id, { days: 30 }),
    fetchAdminMemberLoginHistory(id, { days: 30, limit: 100 }),
  ]);

  if (!member) notFound();

  return (
    <MemberDetailView
      member={member}
      events={events ?? []}
      loginHistory={loginHistory ?? []}
    />
  );
}
