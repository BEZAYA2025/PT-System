import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Founder feedback on Aven responses — POST { message_id, type:
// "correct" | "drift" | "improve", comment?, curriculum_topic_id? }
// Backend (Auftrag E) is rolling out; 4xx on the upstream surfaces
// as a toast in the sparring UI without breaking the conversation.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/admin/aven/feedback", {
    requireAuth: true,
  });
}
