import { fetchAdminMembers } from "@/lib/admin";
import { MembersTable } from "@/components/admin/MembersTable";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const res = await fetchAdminMembers();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Members
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter, and manage everyone on the platform.
        </p>
      </header>

      <MembersTable initialMembers={res?.members ?? null} />
    </div>
  );
}
