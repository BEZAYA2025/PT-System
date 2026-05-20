"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Toast, type ToastState } from "@/components/Toast";

// Reads ?denied=admin from the URL, fires a one-shot toast, and
// strips the query param so a refresh doesn't re-fire. Used in the
// dashboard layout to surface "access restricted" after the admin
// layout's server-side isFounder gate redirects a non-founder.

function AccessDeniedFlashInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const denied = searchParams.get("denied");
    if (denied !== "admin") return;
    setToast({
      message: "Access restricted — admin only.",
      tone: "error",
    });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("denied");
    const qs = params.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    router.replace(url, { scroll: false });
  }, [searchParams, router]);

  return <Toast value={toast} onDismiss={() => setToast(null)} />;
}

export function AccessDeniedFlash() {
  return (
    <Suspense fallback={null}>
      <AccessDeniedFlashInner />
    </Suspense>
  );
}
