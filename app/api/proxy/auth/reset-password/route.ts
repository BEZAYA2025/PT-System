import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pre-auth: the reset token in the body is the credential here, not a
// session cookie. Backend validates the token and rotates the password.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/reset-password");
}
