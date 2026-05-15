import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Member-owned trades feed. Response shape:
//   {
//     has_exchange: boolean,
//     exchange_type: "binance" | "bybit" | "okx" | "bitunix" | null,
//     open: [...],
//     closed: [...]
//   }
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/cockpit/my-trades", {
    requireAuth: true,
  });
}
