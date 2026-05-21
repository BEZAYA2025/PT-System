import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dedicated sparring-chat endpoint used by the Train-Aven studio.
// Backend (Auftrag E + post-VPS-CC refactor) keeps the request shape
// stable across model swaps (Sonnet → Opus) — frontend just POSTs
// {message: string} and reads {reply, context?, message_id?} back.
//
// Different from /api/proxy/aven/chat (member-facing live chat) —
// this one is founder-only, persists meta.founder_sparring=true,
// and the response carries enriched context (VKB / curriculum /
// quality_score) for the founder-tool affordances.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/admin/aven/sparring-chat", {
    requireAuth: true,
  });
}
