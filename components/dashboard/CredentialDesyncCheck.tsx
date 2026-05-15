"use client";

import { useEffect } from "react";

import type { CredentialStatus } from "@/lib/dal";

/**
 * Round-13b diagnostic. Production-confirmed case: `/api/auth/me` returned
 * `binance_api_key_connected: true` for a user whose keys table held no
 * row, while `/api/cockpit/my-trades` correctly reported
 * `has_exchange: false`. The Settings card showed a false-positive
 * "Connected" because it trusted the legacy boolean.
 *
 * This component logs a console warning when the two endpoints disagree
 * about a member's connection state. Frontend-only — does not surface
 * to the UI (the new credential_status path in ExchangeSettingsCard
 * already routes around the legacy boolean). The warn is here so the
 * next time the drift recurs we catch it in browser dev-tools rather
 * than via user reports.
 *
 * Mount once near the dashboard root; the effect runs on mount only.
 */
interface Props {
  /** SSR-known shape of `/api/auth/me` — passed down rather than
   *  re-fetched so the comparison reflects the same `/me` payload that
   *  drove the SSR render. */
  meSnapshot: {
    binance_api_key_connected: boolean;
    credential_status?: CredentialStatus;
    has_exchange_connection?: boolean;
    exchange_type?: string | null;
  };
  /** SSR-known shape of `/api/cockpit/my-trades` (already on the page). */
  myTradesSnapshot: {
    hasExchange: boolean;
    exchangeType: string | null;
  };
}

export function CredentialDesyncCheck({
  meSnapshot,
  myTradesSnapshot,
}: Props) {
  useEffect(() => {
    const meConnected =
      meSnapshot.credential_status === "ok" ||
      meSnapshot.credential_status === "founder_env" ||
      meSnapshot.has_exchange_connection === true ||
      // Legacy fallback — the field that drifted in production.
      (meSnapshot.credential_status === undefined &&
        meSnapshot.has_exchange_connection === undefined &&
        meSnapshot.binance_api_key_connected);

    const tradesConnected = myTradesSnapshot.hasExchange;

    if (Boolean(meConnected) === tradesConnected) return;

    // Disagreement — keep this loud in dev-tools so we notice without
    // user reports. Don't surface to the UI: the new credential_status
    // resolver in ExchangeSettingsCard already renders the right state.
    console.warn(
      "[PT] credential_status desync — /api/auth/me vs /api/cockpit/my-trades",
      {
        me: {
          credential_status: meSnapshot.credential_status,
          has_exchange_connection: meSnapshot.has_exchange_connection,
          binance_api_key_connected: meSnapshot.binance_api_key_connected,
          exchange_type: meSnapshot.exchange_type ?? null,
        },
        myTrades: {
          has_exchange: myTradesSnapshot.hasExchange,
          exchange_type: myTradesSnapshot.exchangeType,
        },
      },
    );
  }, [meSnapshot, myTradesSnapshot]);

  return null;
}
