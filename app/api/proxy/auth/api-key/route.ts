import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Exchange-agnostic. Backend stores the key as api_key_encrypted /
// api_secret_encrypted; tier/exchange flavor is independent of these creds.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/api-key", { requireAuth: true });
}
