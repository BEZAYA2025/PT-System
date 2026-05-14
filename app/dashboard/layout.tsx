import { getInitialNotifications, requireUser } from "@/lib/dal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { mockUserView } from "@/lib/mock-dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth-gate: redirects to /signin when no access_token cookie.
  const user = await requireUser();
  const initialNotifications = await getInitialNotifications(50);

  // ITERATION 6 — display_name still falls back to email until DAL exposes
  // it post onboarding-refactor merge. Notifications are now live (was mock
  // in iter 3); the bell + panel + mark-read all hit /api/proxy/notifications.
  const displayName = user.display_name ?? mockUserView.displayName;

  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader
        displayName={displayName}
        email={user.email}
        notifications={initialNotifications.notifications}
        unreadCount={initialNotifications.unreadCount}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
