import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL;

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not set");
    client = new Resend(resendApiKey);
  }
  return client;
}

const FROM = `PT System <${fromEmail}>`;

export type ConfirmationVars = {
  to: string;
  name: string;
};

export type NotificationVars = {
  name: string;
  email: string;
  experience: string | null;
  markets: string[];
  challenge: string | null;
  source: string | null;
  ip: string | null;
  createdAt: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function confirmationHtml(name: string): string {
  const safeName = escapeHtml(name);
  return `<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #f5f5f5;">
  <h1 style="font-size: 32px; font-weight: 600; margin: 0 0 24px;">
    Welcome to the PT System waitlist.
  </h1>
  <p style="font-size: 16px; line-height: 1.7; color: #a0a0a0;">
    Hi ${safeName},
  </p>
  <p style="font-size: 16px; line-height: 1.7; color: #a0a0a0;">
    Thanks for joining. You're now on the list for Beta access to PT System &mdash; an AI trading mentor built on Paul Theobald's Wave Riding Method.
  </p>
  <p style="font-size: 16px; line-height: 1.7; color: #a0a0a0;">
    We'll be in touch when Beta opens. Until then, we're focused on building Phase 2 &mdash; member onboarding, multi-tenant infrastructure, and refining Aven's depth.
  </p>
  <p style="font-size: 16px; line-height: 1.7; color: #a0a0a0; margin-top: 32px;">
    &mdash; Paul
  </p>
  <hr style="border: none; border-top: 1px solid #1f1f1f; margin: 40px 0 20px;">
  <p style="font-size: 12px; color: #707070;">
    PT System &middot; <a href="https://ptsystem.ai" style="color: #10b981; text-decoration: none;">ptsystem.ai</a>
  </p>
</div>`;
}

function confirmationText(name: string): string {
  return `Welcome to the PT System waitlist.

Hi ${name},

Thanks for joining. You're now on the list for Beta access to PT System — an AI trading mentor built on Paul Theobald's Wave Riding Method.

We'll be in touch when Beta opens. Until then, we're focused on building Phase 2 — member onboarding, multi-tenant infrastructure, and refining Aven's depth.

— Paul

PT System · https://ptsystem.ai
`;
}

function notificationHtml(v: NotificationVars): string {
  const row = (k: string, val: string) =>
    `<tr><td style="padding: 4px 12px 4px 0; color: #707070;">${k}:</td><td>${escapeHtml(val)}</td></tr>`;
  return `<div style="font-family: monospace; padding: 20px;">
  <h2>New waitlist signup</h2>
  <table>
    ${row("Name", v.name)}
    ${row("Email", v.email)}
    ${row("Experience", v.experience ?? "n/a")}
    ${row("Trades", v.markets.join(", ") || "n/a")}
    ${row("Challenge", v.challenge || "n/a")}
    ${row("Source", v.source || "n/a")}
    ${row("Time", v.createdAt)}
    ${row("IP", v.ip ?? "n/a")}
  </table>
</div>`;
}

function notificationText(v: NotificationVars): string {
  return `New waitlist signup

Name:       ${v.name}
Email:      ${v.email}
Experience: ${v.experience ?? "n/a"}
Trades:     ${v.markets.join(", ") || "n/a"}
Challenge:  ${v.challenge || "n/a"}
Source:     ${v.source || "n/a"}
Time:       ${v.createdAt}
IP:         ${v.ip ?? "n/a"}
`;
}

export async function sendConfirmationEmail(vars: ConfirmationVars) {
  return getClient().emails.send({
    from: FROM,
    to: vars.to,
    subject: "You're on the PT System waitlist",
    html: confirmationHtml(vars.name),
    text: confirmationText(vars.name),
  });
}

export async function sendNotificationEmail(vars: NotificationVars) {
  if (!notifyEmail) {
    throw new Error("WAITLIST_NOTIFY_EMAIL is not set");
  }
  return getClient().emails.send({
    from: FROM,
    to: notifyEmail,
    subject: `New PT System signup: ${vars.name}`,
    html: notificationHtml(vars),
    text: notificationText(vars),
  });
}
