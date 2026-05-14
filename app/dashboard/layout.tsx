import {
  getInitialNotifications,
  getRawSnapshot,
  requireUser,
} from "@/lib/dal";
import { buildBtcPriceView } from "@/lib/metrics";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { mockUserView } from "@/lib/mock-dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth-gate: redirects to /signin when no access_token cookie.
  const user = await requireUser();
  const [initialNotifications, snapshot] = await Promise.all([
    getInitialNotifications(50),
    getRawSnapshot(),
  ]);

  const displayName = user.display_name ?? mockUserView.displayName;
  const initialBtcPrice = snapshot
    ? buildBtcPriceView(snapshot, Date.now())
    : null;

  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader
        displayName={displayName}
        email={user.email}
        notifications={initialNotifications.notifications}
        unreadCount={initialNotifications.unreadCount}
        initialBtcPrice={initialBtcPrice}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
