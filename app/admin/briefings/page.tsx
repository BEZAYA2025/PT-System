import { fetchAdminPendingBriefings } from "@/lib/admin";
import { BriefingApprovalView } from "@/components/admin/BriefingApprovalView";

export const dynamic = "force-dynamic";

export default async function AdminBriefingsPage() {
  const res = await fetchAdminPendingBriefings();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Briefings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review pending briefings before they go out to members. Telegram
          truncates at 4096 characters — the full body lives here.
        </p>
      </header>

      <BriefingApprovalView initialPending={res?.briefings ?? null} />
    </div>
  );
}
