"use client";

import { useEffect, useState } from "react";

export interface ImpersonationState {
  active: boolean;
  member_id?: string | null;
  member_name?: string | null;
  member_email?: string | null;
  expires_at?: string | null;
  started_at?: string | null;
}

interface MetaCookie {
  member_id?: string | null;
  member_name?: string | null;
  member_email?: string | null;
  expires_at?: string | null;
  started_at?: string | null;
}

function readMeta(): MetaCookie | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("impersonation_meta="));
  if (!raw) return null;
  try {
    const value = decodeURIComponent(
      raw.slice("impersonation_meta=".length),
    );
    return JSON.parse(value) as MetaCookie;
  } catch {
    return null;
  }
}

/**
 * Subscribe to the current impersonation state. Reads the
 * impersonation_meta cookie set by the /impersonate proxy on
 * successful start (cleared on /exit). Re-checks every 5s so an
 * exit from another tab clears the state here too.
 *
 * Components use { active } to disable mutating UI:
 *   const { active: imp } = useImpersonation();
 *   <button disabled={imp} title={imp ? "Disabled during impersonation" : ""}>
 *     Save
 *   </button>
 */
export function useImpersonation(): ImpersonationState {
  const [meta, setMeta] = useState<MetaCookie | null>(null);

  useEffect(() => {
    const read = () => setMeta(readMeta());
    read();
    const id = window.setInterval(read, 5_000);
    return () => window.clearInterval(id);
  }, []);

  if (!meta) return { active: false };
  // If the cookie's still around but the expiry has passed, treat
  // as inactive — the proxy's /exit will be called on next nav
  // anyway, this just stops a stale meta from gating UI forever.
  if (meta.expires_at) {
    const t = Date.parse(meta.expires_at);
    if (Number.isFinite(t) && t <= Date.now()) {
      return { active: false };
    }
  }
  return {
    active: true,
    member_id: meta.member_id ?? null,
    member_name: meta.member_name ?? null,
    member_email: meta.member_email ?? null,
    expires_at: meta.expires_at ?? null,
    started_at: meta.started_at ?? null,
  };
}
