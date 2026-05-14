import { requireUser } from "@/lib/dal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { mockUserView, mockNotifications } from "@/lib/mock-dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth-gate: redirects to /signin when no access_token cookie.
  const user = await requireUser();

  // ITERATION 3 — display_name fallback to email until DAL exposes it
  // (post onboarding-refactor merge). Notifications come from a mock
  // fixture; iteration 6 swaps in /api/proxy/notifications.
  const displayName = mockUserView.displayName;

  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader
        displayName={displayName}
        email={user.email}
        notifications={mockNotifications}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
