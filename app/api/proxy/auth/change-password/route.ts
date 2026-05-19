import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Body: { current_password, new_password }. Requires a live session
// so requireAuth blocks anonymous calls before they ever leave Vercel.
// Backend returns:
//   200 — rotated. Session may be revoked; UI signs the user out and
//         routes them back to /signin.
//   400 — validation (new password rules)
//   401 — current_password incorrect
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/change-password", {
    requireAuth: true,
  });
}
