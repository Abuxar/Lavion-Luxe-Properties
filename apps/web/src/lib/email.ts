import "server-only";

/**
 * Email delivery.
 *
 * Written against a provider interface rather than a vendor SDK, and talking
 * to Resend over plain fetch — their send API is one POST, so adding a package
 * that would sit unused until a key exists is not worth the dependency.
 *
 * When no key is configured this does not pretend: `send` returns
 * `skipped` and the caller reports that honestly rather than logging a
 * success nobody received.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendResult =
  | { status: "sent"; id: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export interface EmailProvider {
  readonly name: string;
  readonly configured: boolean;
  send(msg: EmailMessage): Promise<SendResult>;
}

const FROM = process.env.EMAIL_FROM ?? "Lavion Luxe <noreply@lavionluxe.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO;

/** Resend. Swapping provider means another object with this shape. */
class ResendProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private readonly key: string) {}
  get configured() {
    return true;
  }

  async send(msg: EmailMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { status: "failed", error: `Resend ${res.status}: ${body.slice(0, 200)}` };
      }
      const data = (await res.json()) as { id?: string };
      return { status: "sent", id: data.id ?? "unknown" };
    } catch (e) {
      return { status: "failed", error: e instanceof Error ? e.message : "network error" };
    }
  }
}

/** Stands in when nothing is configured. Never claims to have sent anything. */
class UnconfiguredProvider implements EmailProvider {
  readonly name = "none";
  readonly configured = false;
  async send(): Promise<SendResult> {
    return { status: "skipped", reason: "No email provider configured" };
  }
}

export function emailProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  return key ? new ResendProvider(key) : new UnconfiguredProvider();
}

export function emailConfigured(): boolean {
  return emailProvider().configured;
}

/* ---------- templates ---------- */

const INK = "#0f1d1f";
const SOFT = "#4a5654";
const BRASS = "#8c6a32";
const PAPER = "#f1efea";
const LINE = "#d8d4ca";

/**
 * A deliberately plain HTML shell.
 *
 * Email clients are not browsers: no external CSS, no web fonts, tables where
 * layout matters, and inline styles throughout. The brand shows through in
 * colour and restraint rather than in typography that would silently fall back.
 */
function shell(title: string, body: string, footerNote: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};">
<tr><td style="padding:28px 28px 0;">
  <div style="font:600 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:2px;color:${SOFT};text-transform:uppercase;">Lavion Luxe Properties</div>
  <div style="height:1px;background:${BRASS};width:64px;margin:16px 0 0;"></div>
</td></tr>
<tr><td style="padding:24px 28px 0;">
  <h1 style="margin:0;font:400 24px/1.25 Georgia,'Times New Roman',serif;color:${INK};">${title}</h1>
</td></tr>
<tr><td style="padding:16px 28px 28px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:${SOFT};">
${body}
</td></tr>
<tr><td style="padding:0 28px 28px;border-top:1px solid ${LINE};">
  <p style="margin:16px 0 0;font:400 12px/1.5 Helvetica,Arial,sans-serif;color:#7d8785;">${footerNote}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export interface AlertProperty {
  title: string;
  price: string;
  locality: string;
  city: string;
  url: string;
  beds?: number;
}

export function savedSearchAlert(input: {
  name?: string;
  searchLabel: string;
  properties: AlertProperty[];
  manageUrl: string;
}): { subject: string; html: string; text: string } {
  const n = input.properties.length;
  const subject =
    n === 1
      ? `A new property matching ${input.searchLabel}`
      : `${n} new properties matching ${input.searchLabel}`;

  const rows = input.properties
    .map(
      (p) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};margin:0 0 12px;">
<tr><td style="padding:16px;">
  <div style="font:400 20px/1.2 Georgia,serif;color:${INK};">${escapeHtml(p.price)}</div>
  <div style="margin:6px 0 0;font:500 14px/1.4 Helvetica,Arial,sans-serif;color:${INK};">${escapeHtml(p.title)}</div>
  <div style="margin:4px 0 0;font:400 12px/1.4 Helvetica,Arial,sans-serif;color:${SOFT};">${escapeHtml(p.locality)}, ${escapeHtml(p.city)}${p.beds !== undefined ? ` &middot; ${p.beds} bed` : ""}</div>
  <a href="${p.url}" style="display:inline-block;margin:14px 0 0;padding:9px 16px;background:${INK};color:${PAPER};font:500 12px/1 Helvetica,Arial,sans-serif;text-decoration:none;">View property</a>
</td></tr></table>`,
    )
    .join("");

  const body = `
<p style="margin:0 0 18px;">${input.name ? `${escapeHtml(input.name)}, s` : "S"}ince we last wrote, ${n === 1 ? "a property has" : `${n} properties have`} come to market matching your saved search — <strong style="color:${INK};">${escapeHtml(input.searchLabel)}</strong>.</p>
${rows}`;

  const text = [
    `${n === 1 ? "A new property" : `${n} new properties`} matching ${input.searchLabel}`,
    "",
    ...input.properties.map((p) => `${p.price} — ${p.title}\n${p.locality}, ${p.city}\n${p.url}\n`),
    `Manage or stop these alerts: ${input.manageUrl}`,
  ].join("\n");

  return {
    subject,
    html: shell(
      subject,
      body,
      `You are receiving this because you followed a search on lavionluxe.com. <a href="${input.manageUrl}" style="color:${BRASS};">Manage or stop these alerts</a>.`,
    ),
    text,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
