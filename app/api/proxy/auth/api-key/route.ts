import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Exchange-agnostic. Backend stores the key as api_key_encrypted /
// api_secret_encrypted; tier/exchange flavor is independent of these creds.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/api-key", { requireAuth: true });
}

// REST-style removal — Round-10 fix: the legacy POST /remove-binance-key
// route was returning errors after the backend went exchange-agnostic.
// DELETE /api/auth/api-key is the new path; the proxy forwards the method.
export async function DELETE(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/api-key", { requireAuth: true });
}
