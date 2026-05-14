import { requireUser } from "@/lib/dal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { mockUserView } from "@/lib/mock-dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth-gate: redirects to /signin when no access_token cookie.
  const user = await requireUser();

  // ITERATION 1 — display_name + unread come from a mock fixture so the
  // skeleton renders end-to-end. Iteration 5 wires display_name from DAL
  // (after the onboarding-refactor lands) and unread from a real source.
  const displayName = mockUserView.displayName;

  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader
        displayName={displayName}
        email={user.email}
        unread={mockUserView.unreadNotifications}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
