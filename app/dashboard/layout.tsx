import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <DashboardSidebar />
      <div className="flex-1 pb-20 lg:pb-0">{children}</div>
    </div>
  );
}
