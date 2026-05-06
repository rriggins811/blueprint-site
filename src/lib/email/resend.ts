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
export async function sendFreeGuideEmail(args: {
  to: string;
  firstName?: string | null;
  activationToken: string;
  pdfUrl?: string;
}): Promise<SendResult> {
  const greeting = args.firstName ? `Hi ${args.firstName},` : "Hi,";
  const subject = args.firstName
    ? `Your Simple Blueprint is here, ${args.firstName}`
    : "Your Simple Blueprint is here";
  const activateUrl =
    `${SITE.url}/activate?token=${encodeURIComponent(args.activationToken)}` +
    `&email=${encodeURIComponent(args.to)}`;
  const pdfUrl = args.pdfUrl ?? process.env.FREEGUIDE_PDF_URL ?? "";
  const html = `
    <p>${greeting}</p>
    <p>The Simple Blueprint is the short, plain-English starter guide for families thinking about a senior housing transition. ${
      pdfUrl
        ? `<a href="${pdfUrl}">Click here to download the PDF</a>.`
        : "Your copy of the PDF is on the way."
    }</p>
    <p>
      Want more than a PDF? Activate your free Blueprint account and you will get:
    </p>
    <ul>
      <li>The online interactive version of Module 00 with the 7-day quick start checklist.</li>
      <li>Three free interactive tools: Starting Point Assessment, Net Proceeds Calculator, and the 7-Day Quick Start tracker.</li>
      <li>A 14-day trial of the SeniorSafe app on iPhone, Android, and the web. Same login.</li>
    </ul>
    <p>
      <a href="${activateUrl}" style="display:inline-block;background:#b45309;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Activate my free account</a>
    </p>
    <p style="color:#555;">
      You will set a password on the next screen. The same password also works
      in the SeniorSafe app on your phone, so you only need to remember one.
    </p>
    <p>If the button does not work, paste this link into your browser:<br><span style="color:#666;font-size:13px;">${activateUrl}</span></p>
    <p>Activation link is good for 7 days.</p>
    <p>Ryan Riggins<br>Riggins Strategic Solutions<br>(336) 553-8933</p>
  `;
  return send({ to: args.to, subject, html });
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
