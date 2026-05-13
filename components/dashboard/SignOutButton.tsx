"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton({
  className,
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      await fetch("/api/proxy/auth/signout", { method: "POST" });
    } finally {
      router.replace("/signin");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={
        className ??
        "inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
      }
    >
      <LogOut aria-hidden="true" className="size-4" />
      {pending ? "Signing out…" : label}
    </button>
  );
}
