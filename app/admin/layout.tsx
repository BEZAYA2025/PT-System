import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isFounder, requireUser } from "@/lib/dal";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageViewTracker } from "@/components/PageViewTracker";

export const metadata: Metadata = {
  title: "Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireUser handles the unauthenticated case (→ /signin). The
  // founder gate runs after, on top of a known-good session. A
  // non-founder lands on /dashboard with no flash of admin chrome
  // because the redirect happens server-side before any HTML streams.
  const user = await requireUser();
  if (!isFounder(user)) {
    redirect("/dashboard");
  }

  const displayName = user.display_name?.trim() || user.email;

  return (
    <AdminShell displayName={displayName}>
      {children}
      <PageViewTracker />
    </AdminShell>
  );
}
