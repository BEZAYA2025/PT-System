import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Checkout-session is callable both pre-signup (anon) and post-signup (auth),
// so we forward the cookie when present but do not require it.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/stripe/create-checkout-session", {
    withAuth: true,
  });
}
