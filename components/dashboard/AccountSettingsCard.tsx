"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCheck,
  IconPencil,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import { SignOutButton } from "./SignOutButton";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  cardClasses,
  inputClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { Toast, type ToastState } from "@/components/Toast";
import { SettingsCardHeader } from "./SettingsCardHeader";

interface Props {
  email: string;
  displayName: string | null;
}

export function AccountSettingsCard({ email, displayName }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const startEdit = () => {
    setValue(displayName ?? "");
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setError("Display name can't be empty.");
      return;
    }
    if (trimmed.length > 80) {
      setError("Keep it under 80 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : `Couldn't save (${res.status}).`;
        setError(msg);
        return;
      }
      setToast({ message: "Display name saved.", tone: "success" });
      setEditing(false);
      router.refresh();
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Profile · Account"
        title="Account"
        description="Your sign-in email and the name Aven uses to address you."
        icon={<IconUserCircle size={18} stroke={1.75} aria-hidden />}
      />

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Email
          </dt>
          <dd className="mt-1 font-mono text-foreground">{email}</dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Display name
          </dt>
          {!editing ? (
            <dd className="mt-1 flex items-center gap-2 text-foreground">
              <span>
                {displayName || (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </span>
              <button
                type="button"
                onClick={startEdit}
                aria-label="Edit display name"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                <IconPencil size={14} stroke={1.75} />
              </button>
            </dd>
          ) : (
            <dd className="mt-1">
              <div className="flex items-center gap-2">
                <label htmlFor="display-name-input" className="sr-only">
                  Display name
                </label>
                <input
                  id="display-name-input"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={saving}
                  autoFocus
                  maxLength={80}
                  placeholder="What should Aven call you?"
                  className={`${inputClasses} text-sm`}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className={`${buttonPrimaryClasses} h-9 px-4 text-xs`}
                >
                  <IconCheck size={12} stroke={2} className="mr-1" />
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={saving}
                  className={`${buttonSecondaryClasses} h-9 px-4 text-xs`}
                >
                  <IconX size={12} stroke={2} className="mr-1" />
                  Cancel
                </button>
              </div>
            </dd>
          )}
        </div>
      </dl>

      {error && (
        <p role="alert" className={`${submitErrorClasses} mt-4`}>
          {error}
        </p>
      )}

      <div className="mt-6">
        <SignOutButton className={buttonSecondaryClasses} />
      </div>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}
