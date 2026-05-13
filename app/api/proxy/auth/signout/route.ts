import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/signout", {
    withAuth: true,
    clearCookies: true,
  });
}
