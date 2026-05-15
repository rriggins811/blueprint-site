import { Resend } from "resend";
import { SITE } from "@/lib/site";

// Build the client lazily so a missing RESEND_API_KEY does not crash
// other server code on import. If the key is missing we log and skip,
// so the rest of the purchase flow still completes.
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "Ryan Riggins <ryan@rigginsstrategicsolutions.com>";

export type SendResult = { ok: true; id: string } | { ok: false; reason: string };

async function send(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const client = getClient();
  if (!client) {
    console.warn(
      `[email] RESEND_API_KEY not set, skipping send to ${args.to} (subject: ${args.subject})`
    );
    return { ok: false, reason: "no_api_key" };
  }
  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text ?? stripHtml(args.html),
      replyTo: args.replyTo ?? SITE.supportEmail,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, id: data?.id ?? "unknown" };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\n\s+/g, "\n").trim();
}

// Reusable SeniorSafe trial section appended to any Blueprint welcome email.
// The trial is auto-started for every new Blueprint signup (free or paid) and
// grants the full Premium+ experience including Maggie for 14 days. Same
// login as the Blueprint dashboard — Supabase session is shared across the
// blueprint.r.com and app.seniorsafeapp.com sub-products.
const SENIORSAFE_TRIAL_SECTION = `
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;" />
    <h2 style="font-size:18px;margin:0 0 8px 0;">Plus: 14 days of SeniorSafe free</h2>
    <p style="margin:0 0 12px 0;">
      Your Blueprint signup also activated a 14-day trial of the SeniorSafe
      family-coordination app at the full Premium+ tier. No card, no extra
      signup. Same login.
    </p>
    <p style="margin:0 0 8px 0;">For the next 14 days you have:</p>
    <ul>
      <li>Daily wellness check-ins, medication and appointment tracking, secure document vault.</li>
      <li>Private family messaging that beats group texts.</li>
      <li>Maggie, the AI transition specialist trained on the full Blueprint methodology — the same one Premium+ subscribers get.</li>
    </ul>
    <p>
      <a href="https://app.seniorsafeapp.com" style="display:inline-block;background:#1B365D;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Open the app</a>
    </p>
    <p style="color:#555;font-size:13px;">
      Use the same login (Blueprint password or Google sign-in). Trial is
      automatic — when it ends you can pick a paid SeniorSafe plan or just
      stop using the app, no charges either way.
    </p>
`;

export async function sendCoreWelcomeEmail(args: { to: string; firstName?: string | null }) {
  const greeting = args.firstName ? `Hi ${args.firstName},` : "Welcome,";
  const subject = "Your Blueprint is ready";
  const dashboardUrl = `${SITE.url}/dashboard`;
  const html = `
    <p>${greeting}</p>
    <p>You just bought the Senior Transition Blueprint. Thank you. Here is what to do next.</p>
    <p>
      <a href="${dashboardUrl}">Open your dashboard</a> and start with Module 00. It is the orientation lesson and lays out the 7-day quick start. About 15 minutes.
    </p>
    <p>
      A few things to know:
    </p>
    <ul>
      <li>You have lifetime access. The 19 modules and every tool stay yours.</li>
      <li>Self-paced. Use what fits your situation, skip what does not.</li>
      <li>If you get stuck, reply to this email. I read every one.</li>
    </ul>
    ${SENIORSAFE_TRIAL_SECTION}
    <p>Ryan</p>
    <p style="color:#888;font-size:12px;">Riggins Strategic Solutions</p>
  `;
  return send({ to: args.to, subject, html });
}

// Free guide email — sent immediately on /freeguide form submit. Replaces the
// magic-link primary auth flow because Outlook Safe Links pre-fetches magic
// link URLs and consumes the one-time code, breaking auth for Outlook /
// Hotmail recipients (large chunk of the audience). The activation link goes
// to /activate (a form, not an auth endpoint), so Safe Links pre-fetch is
// harmless.
//
// Body redesign 2026-05-15: removed the "Click here to download the PDF" link
// at the top of the email — data from 7+ real signups May 11-15 showed every
// recipient clicked the PDF, got the guide, never clicked Activate. The PDF
// link was competing with the activation CTA and winning every time. Now the
// PDF lives on the post-activation Blueprint dashboard. The `pdfUrl` arg is
// kept (forward-compatible) but ignored inside the body.
export async function sendFreeGuideEmail(args: {
  to: string;
  firstName?: string | null;
  activationToken: string;
  /** Kept for forward compatibility; PDF is no longer linked from this email.
   *  See dashboard/page.tsx for the post-activation PDF download. */
  pdfUrl?: string;
}): Promise<SendResult> {
  void args.pdfUrl;
  const subject = args.firstName
    ? `Your Simple Blueprint is here, ${args.firstName}`
    : "Your Simple Blueprint is here";
  const firstName = args.firstName ?? "there";
  const activateUrl =
    `${SITE.url}/activate?token=${encodeURIComponent(args.activationToken)}` +
    `&email=${encodeURIComponent(args.to)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Simple Blueprint is here</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 24px;">

  <p>Hi ${firstName},</p>

  <p>Your free Blueprint account is ready. One click activates everything:</p>

  <ul style="line-height: 1.7; padding-left: 20px;">
    <li>The online interactive Module 00 + 7-day Quick Start checklist</li>
    <li>Three free interactive tools: Starting Point Assessment, Net Proceeds Calculator, and the 7-Day Quick Start tracker</li>
    <li>A 14-day Premium+ trial of the SeniorSafe app on iPhone, Android, and web (same login)</li>
    <li>Maggie, the AI transition specialist trained on the full Blueprint methodology</li>
  </ul>

  <p style="text-align: center; margin: 36px 0;">
    <a href="${activateUrl}" style="background: #B36B3A; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 16px;">Activate my free account</a>
  </p>

  <p>You'll set a password on the next screen. The same password also works in the SeniorSafe app on your phone, so you only need to remember one.</p>

  <p style="font-size: 13px; color: #666;">
    If the button does not work, paste this link into your browser:<br>
    <a href="${activateUrl}" style="word-break: break-all; color: #B36B3A;">${activateUrl}</a>
  </p>

  <p style="font-size: 13px; color: #666;">Activation link is good for 7 days.</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 14px; color: #444;">The SeniorSafe app trial includes daily wellness check-ins, secure document vault, private family messaging, and Maggie. No card, no extra signup. Trial is automatic — when it ends you can pick a paid plan or just stop using the app, no charges either way.</p>

  <p style="margin-top: 32px;">
    Ryan Riggins<br>
    Riggins Strategic Solutions<br>
    (336) 553-8933
  </p>

</body>
</html>
  `;

  // Explicit plain-text fallback (instead of letting send() auto-derive via
  // stripHtml). Better deliverability and easier to read in text-only clients.
  const text = `Hi ${firstName},

Your free Blueprint account is ready. One click activates everything:

- The online interactive Module 00 + 7-day Quick Start checklist
- Three free interactive tools: Starting Point Assessment, Net Proceeds Calculator, and the 7-Day Quick Start tracker
- A 14-day Premium+ trial of the SeniorSafe app on iPhone, Android, and web (same login)
- Maggie, the AI transition specialist trained on the full Blueprint methodology

Activate my free account: ${activateUrl}

You'll set a password on the next screen. The same password also works in the SeniorSafe app on your phone, so you only need to remember one.

Activation link is good for 7 days.

The SeniorSafe app trial includes daily wellness check-ins, secure document vault, private family messaging, and Maggie. No card, no extra signup. Trial is automatic — when it ends you can pick a paid plan or just stop using the app, no charges either way.

Ryan Riggins
Riggins Strategic Solutions
(336) 553-8933
`;

  return send({ to: args.to, subject, html, text });
}

export async function sendPremiumWelcomeEmail(args: {
  to: string;
  firstName?: string | null;
}) {
  const greeting = args.firstName ? `Hi ${args.firstName},` : "Welcome,";
  const subject = "Your Premium Blueprint is ready, and so am I";
  const dashboardUrl = `${SITE.url}/dashboard`;
  const calUrl = SITE.premiumCalBookingUrl;
  const intakeUrl = `${SITE.url}/api/pdf/tool-19b-premium-intake-form`;
  const html = `
    <p>${greeting}</p>
    <p>You did not just buy the course. You bought a 60-minute working session with me, plus 90 days of email support. Thank you.</p>
    <p>Two things to do this week:</p>
    <ol>
      <li>
        <strong>Book your strategy call.</strong>
        <a href="${calUrl}">Pick a time that works</a>. The call is 60 minutes, weekdays only. Pick something at least a week out so you have time for step 2.
      </li>
      <li>
        <strong>Fill out the intake form.</strong>
        <a href="${intakeUrl}">Download the Premium Intake Form here</a> and email it back before the call. It tells me your situation, your timeline, and your top three questions, so we spend the call solving problems instead of catching up.
      </li>
    </ol>
    <p>
      <a href="${dashboardUrl}">Your dashboard is here</a>. The Premium banner at the top has the booking link too, in case you need it later.
    </p>
    <p>I will email you the day before our call. Until then, reply to this email if you need anything.</p>
    <p>Ryan</p>
    <p style="color:#888;font-size:12px;">Riggins Strategic Solutions. You have Premium support until 90 days from your purchase date.</p>
  `;
  return send({ to: args.to, subject, html });
}
