import { requireUser } from "@/lib/dal";
import {
  fetchAdminCriticalDriftToday,
  fetchAdminFunnel,
  fetchAdminImpersonationSessions,
  fetchAdminMembers,
  fetchAdminMrr,
  fetchAdminPendingBriefings,
  fetchAdminSignups,
  fetchAdminSystemHealth,
} from "@/lib/admin";
import { OverviewView } from "@/components/admin/OverviewView";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const user = await requireUser();
  const displayName = user.display_name?.trim() || user.email;

  const [
    membersRes,
    mrrRes,
    signupsRes,
    funnelRes,
    pendingRes,
    healthRes,
    impSessions,
    driftToday,
  ] = await Promise.all([
    fetchAdminMembers(),
    fetchAdminMrr(),
    fetchAdminSignups(),
    fetchAdminFunnel(),
    fetchAdminPendingBriefings(),
    fetchAdminSystemHealth(),
    fetchAdminImpersonationSessions(),
    fetchAdminCriticalDriftToday(),
  ]);

  return (
    <OverviewView
      displayName={displayName}
      members={membersRes?.members ?? null}
      mrr={mrrRes}
      signups={signupsRes}
      funnel={funnelRes}
      pendingBriefingsCount={pendingRes?.briefings.length ?? null}
      systemHealth={healthRes}
      impersonationSessions={impSessions ?? []}
      criticalDriftCount={driftToday?.length ?? 0}
    />
  );
}
