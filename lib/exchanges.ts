// Exchange registry. The VPS multi-tenant adapter ships read-only support
// for these 9 venues today. The frontend uses this list for:
//   - the picker in ConnectExchangeModal
//   - status-badge formatting in ExchangeSettingsCard
//   - any future "supported exchanges" surfacing
//
// Adding a new exchange = adding an entry here + the backend adapter.
// The `id` MUST match the backend's `exchange_type` enum verbatim.

export type ExchangeId =
  | "binance"
  | "bybit"
  | "okx"
  | "bitget"
  | "bitunix"
  | "kucoin"
  | "mexc"
  | "gate"
  | "hyperliquid";

export interface ExchangeDef {
  id: ExchangeId;
  /** Display name — caps + capitalisation set per brand convention.  */
  label: string;
  /** True when the exchange requires a 3rd credential (passphrase /
   *  trading-password). Drives the conditional form field. */
  passphrase: boolean;
  /** One-line "how to create a read-only key on this exchange" hint —
   *  rendered in the wizard's Step-2 panel. */
  hint: string;
  /** Optional deep-link to the exchange's API-key docs page. Surfaces an
   *  "Open <exchange> docs" link in the hint panel. */
  docsUrl?: string;
}

export const EXCHANGES: ReadonlyArray<ExchangeDef> = [
  {
    id: "binance",
    label: "Binance",
    passphrase: false,
    hint: "Binance → API Management → Create API → Restrict access to trusted IPs → paste our server IP.",
    docsUrl: "https://www.binance.com/en/support/faq/360002502072",
  },
  {
    id: "bybit",
    label: "Bybit",
    passphrase: false,
    hint: "Bybit → API → Create New Key → API Permissions: Read-only. IP restriction recommended.",
    docsUrl: "https://www.bybit.com/app/user/api-management",
  },
  {
    id: "okx",
    label: "OKX",
    passphrase: true,
    hint: "OKX → API → Create V5 API key. Set permissions to Read + IP-restrict. A passphrase is required at creation.",
    docsUrl: "https://www.okx.com/account/my-api",
  },
  {
    id: "bitget",
    label: "Bitget",
    passphrase: false,
    hint: "Bitget → API Management → Create API → Permissions: Read-only → bind IP.",
    docsUrl: "https://www.bitget.com/en/support/articles/360038968272",
  },
  {
    id: "bitunix",
    label: "Bitunix",
    passphrase: false,
    hint: "Bitunix → Account → API Management → Create API → Read-only access + IP whitelist.",
  },
  {
    id: "kucoin",
    label: "KuCoin",
    passphrase: true,
    hint: "KuCoin → API → Create API → General (read). Passphrase + IP-restriction both required.",
    docsUrl: "https://www.kucoin.com/account/api",
  },
  {
    id: "mexc",
    label: "MEXC",
    passphrase: false,
    hint: "MEXC → API Management → Create → Permissions: Read-only → IP whitelist.",
    docsUrl: "https://www.mexc.com/user/openapi",
  },
  {
    id: "gate",
    label: "Gate.io",
    passphrase: false,
    hint: "Gate.io → API → Create API key → Read permissions for Spot + Futures.",
    docsUrl: "https://www.gate.io/myaccount/apiv4keys",
  },
  {
    id: "hyperliquid",
    label: "Hyperliquid",
    passphrase: false,
    hint: "Hyperliquid → API → Generate API Wallet → save the API wallet address + private key.",
    docsUrl: "https://app.hyperliquid.xyz/API",
  },
];

const BY_ID: ReadonlyMap<string, ExchangeDef> = new Map(
  EXCHANGES.map((e) => [e.id, e]),
);

/** Resolve an exchange definition by id. Returns null for unknown strings
 *  so callers can render a safe fallback when the backend returns a value
 *  the frontend doesn't yet know about. */
export function findExchange(id: string | null | undefined): ExchangeDef | null {
  if (!id) return null;
  return BY_ID.get(id.toLowerCase()) ?? null;
}

/** Friendly label for any exchange id — handles unknown strings by
 *  title-casing them (so a brand-new backend-side exchange still renders
 *  something readable). */
export function formatExchangeLabel(id: string | null | undefined): string {
  if (!id) return "exchange";
  const known = findExchange(id);
  if (known) return known.label;
  const lower = id.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
