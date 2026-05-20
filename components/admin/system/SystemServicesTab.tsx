"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleDot,
  IconExclamationCircle,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import { formatDateTime } from "@/lib/admin-format";

interface Service {
  name: string;
  status?: "healthy" | "degraded" | "down" | "unhealthy" | string | null;
  uptime_seconds?: number | null;
  last_restart_at?: string | null;
  details?: string | null;
}

function statusTone(s: string | null | undefined): {
  pill: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; stroke?: number }>;
} {
  const v = (s ?? "").toLowerCase();
  if (v === "healthy")
    return {
      pill: "border-emerald/30 bg-emerald/[0.08] text-emerald",
      label: "Healthy",
      Icon: IconCircleCheck,
    };
  if (v === "degraded")
    return {
      pill: "border-amber-500/30 bg-amber-500/[0.08] text-amber-200",
      label: "Degraded",
      Icon: IconCircleDot,
    };
  return {
    pill: "border-red-400/40 bg-red-500/[0.08] text-red-300",
    label: "Down",
    Icon: IconExclamationCircle,
  };
}

function formatUptime(s: number | null | undefined): string {
  if (s === null || s === undefined || s <= 0) return "—";
  const days = Math.floor(s / 86400);
  if (days > 0) return `${days}d ${Math.floor((s % 86400) / 3600)}h`;
  const hrs = Math.floor(s / 3600);
  if (hrs > 0) return `${hrs}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 60)}m`;
}

export function SystemServicesTab() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState<Service | null>(null);
  const [restartingName, setRestartingName] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/system/services", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as Service[])
        : data && typeof data === "object"
          ? ((data as { services?: Service[] }).services ?? [])
          : [];
      setServices(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const restart = async (svc: Service) => {
    setRestartingName(svc.name);
    try {
      const res = await fetch(
        `/api/proxy/admin/system/services/${encodeURIComponent(svc.name)}/restart`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast({ message: `Restart triggered · ${svc.name}`, tone: "success" });
      await reload();
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Restart failed · ${err.message}`
            : "Restart failed",
        tone: "error",
      });
    } finally {
      setRestartingName(null);
      setConfirmRestart(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Services
        </h2>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40 disabled:opacity-60"
        >
          {loading ? (
            <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          ) : (
            <IconRefresh size={12} stroke={1.75} aria-hidden />
          )}
          Re-check
        </button>
      </header>

      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      {!loading && !error && services && services.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No services reported.
        </p>
      )}

      {services && services.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => {
            const tone = statusTone(svc.status);
            return (
              <article
                key={svc.name}
                className="rounded-xl border border-border bg-surface/40 p-4"
              >
                <header className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {svc.name}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.pill}`}
                  >
                    <tone.Icon size={10} stroke={2} aria-hidden />
                    {tone.label}
                  </span>
                </header>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Uptime</dt>
                    <dd className="font-mono text-foreground">
                      {formatUptime(svc.uptime_seconds)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Last restart</dt>
                    <dd className="font-mono text-foreground">
                      {formatDateTime(svc.last_restart_at)}
                    </dd>
                  </div>
                </dl>
                {svc.details && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {svc.details}
                  </p>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmRestart(svc)}
                    disabled={restartingName === svc.name}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-2.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/[0.14] disabled:opacity-60"
                  >
                    {restartingName === svc.name && (
                      <IconLoader2
                        size={11}
                        stroke={2}
                        className="animate-spin"
                        aria-hidden
                      />
                    )}
                    Restart
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={confirmRestart !== null}
        onClose={() =>
          restartingName === null && setConfirmRestart(null)
        }
        title={`Restart ${confirmRestart?.name ?? ""}?`}
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            The service will briefly drop. Active connections + in-flight
            jobs may need to retry.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmRestart(null)}
              disabled={restartingName !== null}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirmRestart && restart(confirmRestart)}
              disabled={restartingName !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/[0.14] disabled:opacity-60"
            >
              {restartingName !== null && (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              )}
              Restart
            </button>
          </div>
        </div>
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
