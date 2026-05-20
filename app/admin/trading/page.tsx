import type { Metadata } from "next";
import { TradingSectionView } from "@/components/admin/TradingSectionView";

export const metadata: Metadata = {
  title: "Trading · Admin · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminTradingPage() {
  return <TradingSectionView />;
}
