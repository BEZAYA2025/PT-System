import { fetchAdminDiscountCodes } from "@/lib/admin";
import { DiscountCodesTable } from "@/components/admin/DiscountCodesTable";

export const dynamic = "force-dynamic";

export default async function AdminDiscountCodesPage() {
  const res = await fetchAdminDiscountCodes();

  return (
    <div className="space-y-6">
      <DiscountCodesTable initialCodes={res?.codes ?? null} />
    </div>
  );
}
