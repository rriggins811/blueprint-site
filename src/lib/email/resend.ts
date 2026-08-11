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

// Free pivot (Jul 25 2026): every Roadmap application lands in Ryan's inbox
// in full, replyTo set to the applicant so Ryan can answer with one reply.
export async function sendRoadmapApplicationToRyan(app: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  relationship: string;
  homeSituation: string;
  timeline: string;
  biggestConcern: string;
  professionals: string[];
  notes?: string | null;
  pressure?: string | null;
  seniorWillingness?: string | null;
}): Promise<SendResult> {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#555;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:6px 0;">${esc(value)}</td></tr>`;
  const html = `
    <h2 style="margin:0 0 4px 0;">Roadmap application: ${esc(app.firstName)} ${esc(app.lastName)}</h2>
    <p style="margin:0 0 16px 0;color:#555;">Review before the intake call they were just offered. Reply to this email to reach them directly.</p>
    <table style="border-collapse:collapse;font-size:14px;">
      ${row("Name", `${app.firstName} ${app.lastName}`)}
      ${row("Email", app.email)}
      ${row("Phone", app.phone)}
      ${row("State", app.state)}
      ${row("For", app.relationship)}
      ${row("Home", app.homeSituation)}
      ${row("Timeline", app.timeline)}
      ${row("Professionals", app.professionals.length ? app.professionals.join(", ") : "none listed")}
      ${app.pressure ? row("Pressure", app.pressure) : ""}
      ${app.seniorWillingness ? row("Senior's willingness", app.seniorWillingness) : ""}
    </table>
    <h3 style="margin:20px 0 4px 0;font-size:15px;">Biggest concern</h3>
    <p style="margin:0;white-space:pre-wrap;">${esc(app.biggestConcern)}</p>
    ${app.notes ? `<h3 style="margin:20px 0 4px 0;font-size:15px;">Anything else</h3><p style="margin:0;white-space:pre-wrap;">${esc(app.notes)}</p>` : ""}
    <p style="margin:24px 0 0 0;color:#888;font-size:12px;">Also filed: GHL contact note + Referral Pipeline card (Conversation stage) + this application in the roadmap_applications table.</p>
  `;
  const urgent = app.pressure === "Something is signed or about to be";
  return send({
    to: "ryan@rigginsstrategicsolutions.com",
    subject: `${urgent ? "URGENT " : ""}Roadmap application: ${app.firstName} ${app.lastName} (${app.state}, ${app.timeline})`,
    html,
    replyTo: app.email,
  });
}

/**
 * The completed (or partial) Roadmap intake, sent to Ryan.
 *
 * Deliberately ships the SAME markdown that feeds the roadmap generator rather
 * than a prettier parallel format. One rendering means the document Ryan reads
 * on his phone before a call and the document pasted into the brain can never
 * drift apart, and skips stay visible as flags in both.
 */
export async function sendIntakeToRyan(args: {
  applicantName: string;
  complete: boolean;
  markdown: string;
}): Promise<SendResult> {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const flagCount = (args.markdown.match(/\(flag\)/g) ?? []).length;
  const html = `
    <h2 style="margin:0 0 4px 0;">${args.complete ? "Completed" : "Partial"} intake: ${esc(args.applicantName)}</h2>
    <p style="margin:0 0 16px 0;color:#555;">
      ${
        args.complete
          ? "They worked all the way through."
          : "They stopped partway and chose to finish on the call. Everything they skipped is marked below."
      }
      ${flagCount ? `<strong>${flagCount} flag-critical unknown${flagCount === 1 ? "" : "s"}.</strong>` : ""}
    </p>
    <p style="margin:0 0 16px 0;color:#555;font-size:13px;">Paste the block below straight into the roadmap generator. It is already in Part A format.</p>
    <pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.5;background:#faf8f3;border:1px solid #e7e2d6;border-radius:6px;padding:16px;">${esc(args.markdown)}</pre>
  `;
  return send({
    to: "ryan@rigginsstrategicsolutions.com",
    subject: `${args.complete ? "Intake complete" : "Intake partial"}: ${args.applicantName}${flagCount ? ` (${flagCount} flags)` : ""}`,
    html,
    text: args.markdown,
  });
}

/**
 * The intake invitation, sent to the family right after they apply.
 *
 * The thanks page already offers the intake, but that link dies the moment
 * they close the tab, and the whole point of this form is that an exhausted
 * adult child can come back to it days later when a real crisis lets up. This
 * puts a durable, resumable link in their inbox.
 *
 * Framed as optional in the subject and the first line, on purpose. The spec's
 * central risk is abandonment, and a "you need to complete this" email is the
 * fastest way to make an optional form feel like homework.
 */
export async function sendIntakeInviteToApplicant(args: {
  to: string;
  firstName: string;
  intakeUrl: string;
}): Promise<SendResult> {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const name = args.firstName.trim() || "there";
  const subject = `Optional: give Ryan a head start before your call`;

  const html = `
    <p>Hi ${esc(name)},</p>
    <p>Your Roadmap application is in, and Ryan reviews every one personally before the call.</p>
    <p>If you want to, there is a short set of questions you can answer beforehand: the home, the money, the legal documents, and where your family stands. It is completely optional. Plenty of families walk through it live on the call instead, and that is fine.</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="${args.intakeUrl}" style="background:#1B365D;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;font-size:16px;">Start the intake</a>
    </p>
    <p><strong>Answer what you know and skip what you do not.</strong> "I don't know" is a genuinely useful answer here, especially on the legal questions. Not knowing whether there is a power of attorney tells Ryan more than a guess would.</p>
    <p>Your answers save as you go, so you can stop partway, close the tab, and come back to this same link whenever you have a minute. Even a half-finished one means less ground to cover on the call.</p>
    <p>Hit reply if anything is confusing. I read every one.</p>
    <p style="margin-top:32px;">
      Ryan Riggins<br>
      Senior Transition Advisor and Advocate<br>
      Riggins Strategic Solutions<br>
      (336) 553-8933
    </p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;">
    <p style="font-size:11px;color:#888;">
      Ryan Riggins | NC Real Estate License #361546 | eXp Realty<br>
      Riggins Strategic Solutions, LLC, Greensboro, NC<br>
      This is educational and not a substitute for legal, financial, tax, or medical advice.<br>
      You're receiving this because you applied for the Senior Transition Roadmap at rigginsstrategicsolutions.com. To stop receiving emails, reply with "unsubscribe."
    </p>
  `;

  const text = `Hi ${name},

Your Roadmap application is in, and Ryan reviews every one personally before the call.

If you want to, there is a short set of questions you can answer beforehand: the home, the money, the legal documents, and where your family stands. It is completely optional. Plenty of families walk through it live on the call instead, and that is fine.

Start the intake: ${args.intakeUrl}

Answer what you know and skip what you do not. "I don't know" is a genuinely useful answer here, especially on the legal questions. Not knowing whether there is a power of attorney tells Ryan more than a guess would.

Your answers save as you go, so you can stop partway, close the tab, and come back to this same link whenever you have a minute. Even a half-finished one means less ground to cover on the call.

Hit reply if anything is confusing. I read every one.

Ryan Riggins
Senior Transition Advisor and Advocate
Riggins Strategic Solutions
(336) 553-8933

---
Ryan Riggins | NC Real Estate License #361546 | eXp Realty
Riggins Strategic Solutions, LLC, Greensboro, NC
This is educational and not a substitute for legal, financial, tax, or medical advice.
You're receiving this because you applied for the Senior Transition Roadmap at rigginsstrategicsolutions.com. To stop receiving emails, reply with "unsubscribe."
`;

  return send({ to: args.to, subject, html, text });
}

export async function sendCoreWelcomeEmail(args: {
  to: string;
  firstName?: string | null;
  /** One-click magic-login link that lands on /dashboard. When present it is
   *  used as the primary CTA so the buyer is logged in on click. A permanent
   *  /dashboard link is always shown alongside it as a backstop (the magic
   *  link expires), and the URL is included in the plain-text part too. */
  loginUrl?: string;
}) {
  const greeting = args.firstName ? `Hi ${args.firstName},` : "Welcome,";
  const subject = "Your Blueprint is ready";
  const dashboardUrl = `${SITE.url}/dashboard`; // permanent backstop link
  const ctaUrl = args.loginUrl ?? dashboardUrl; // one-click login when available
  // Permanent-link fallback line, only when the CTA is the expiring magic link.
  const fallbackHtml = args.loginUrl
    ? `<p style="font-size:13px;color:#666;">The link above logs you in automatically and expires after a while. You can always sign in later at <a href="${dashboardUrl}">${dashboardUrl}</a>.</p>`
    : "";
  const html = `
    <p>${greeting}</p>
    <p>You just bought the Senior Transition Blueprint. Thank you. Here is what to do next.</p>
    <p>
      <a href="${ctaUrl}">Open your dashboard</a> and start with Module 00. It is the orientation lesson and lays out the 7-day quick start. About 15 minutes.
    </p>
    ${fallbackHtml}
    <p>
      A few things to know:
    </p>
    <ul>
      <li>You have lifetime access. The 20 modules and every tool stay yours.</li>
      <li>Self-paced. Use what fits your situation, skip what does not.</li>
      <li>If you get stuck, reply to this email. I read every one.</li>
    </ul>
    ${SENIORSAFE_TRIAL_SECTION}
    <p>Ryan</p>
    <p style="color:#888;font-size:12px;">Riggins Strategic Solutions</p>
  `;
  // Explicit plain-text part: stripHtml would delete <a href> and keep only the
  // anchor text, erasing the login URL. Mirror the HTML with the literal URLs.
  const fallbackText = args.loginUrl
    ? `\n(The link above logs you in automatically and expires after a while. You can always sign in later at ${dashboardUrl})\n`
    : "";
  const text = `${greeting}

You just bought the Senior Transition Blueprint. Thank you. Here is what to do next.

Open your dashboard and start with Module 00 (about 15 minutes):
${ctaUrl}
${fallbackText}
A few things to know:
- You have lifetime access. The 20 modules and every tool stay yours.
- Self-paced. Use what fits your situation, skip what does not.
- If you get stuck, reply to this email. I read every one.

Plus: your Blueprint signup activated a 14-day Premium+ trial of the SeniorSafe app, same login: https://app.seniorsafeapp.com

Ryan
Riggins Strategic Solutions`;
  return send({ to: args.to, subject, html, text });
}

/**
 * Lead-magnet email metadata. Mirrors the per-magnet entries in
 * rss-site/src/lib/lead-magnets.ts (single source of truth for the
 * registry lives on rss-site; blueprint-site duplicates only the
 * email-template fields here so the welcome email can render magnet-
 * aware content without a cross-repo dependency).
 *
 * When rss-site adds a new magnet, add a matching entry here so the
 * Blueprint welcome email can include the direct PDF link for it.
 * If the magnetSlug arg doesn't match any entry, the email silently
 * falls back to the standard Simple Blueprint template.
 */
type LeadMagnetEmailMeta = {
  title: string;
  subtitle: string;
  pageCount: number;
  pdfUrl: string;
  /**
   * Optional phrase used in the subject line, replacing the default
   * `${title} guide`. Subject rendered as: "Your ${subjectBase} is here[,
   * ${firstName}]". Use when the title alone reads awkward in a subject
   * (e.g. magnet titled "When Mom Falls at 2 AM" wants subjectBase
   * "Crisis Playbook" instead of "When Mom Falls at 2 AM guide").
   */
  subjectBase?: string;
  /**
   * Optional phrase used as the bolded text in the intro paragraph,
   * replacing the default `${title}`. Intro rendered as: "Your
   * <strong>${introBase}</strong>${introTrailing} is ready, and so is
   * your free Blueprint account. ...".
   */
  introBase?: string;
  /**
   * Optional word(s) inserted between the bolded intro phrase and
   * " is ready". Default is " guide" (CBB + Aging in Place case).
   * Set to "" to omit the word (e.g. when introBase already contains
   * "Playbook" / "Guide" / etc.).
   */
  introTrailing?: string;
};

const LEAD_MAGNET_EMAIL_META: Record<string, LeadMagnetEmailMeta> = {
  "cash-buyer-beware": {
    title: "Cash Buyer Beware",
    subtitle: "What to know before Mom signs anything",
    pageCount: 15,
    pdfUrl: "https://rigginsstrategicsolutions.com/downloads/cash-buyer-beware.pdf",
  },
  "when-mom-falls-crisis-playbook": {
    title: "When Mom Falls at 2 AM",
    subtitle:
      "The First 30 Minutes (and the 30 Mistakes Most Families Make)",
    pageCount: 17,
    pdfUrl:
      "https://rigginsstrategicsolutions.com/downloads/when-mom-falls-crisis-playbook.pdf",
    // Subject: "Your Crisis Playbook is here, Ryan"
    subjectBase: "Crisis Playbook",
    // Intro bolded phrase: "Your When Mom Falls Crisis Playbook is ready..."
    introBase: "When Mom Falls Crisis Playbook",
    introTrailing: "",
  },
  "aging-in-place-vs-assisted-living": {
    title: "Aging in Place vs Assisted Living",
    subtitle: "The Honest Math (and 5 Questions That Actually Decide)",
    pageCount: 17,
    pdfUrl:
      "https://rigginsstrategicsolutions.com/downloads/aging-in-place-vs-assisted-living.pdf",
    // Subject: "Your Aging in Place guide is here, Ryan"
    subjectBase: "Aging in Place guide",
    // Intro bolded phrase: "Your Aging in Place vs Assisted Living guide is ready..."
    // (introBase defaults to title; introTrailing defaults to " guide" — both fine)
  },
  "medicare-coverage-gaps": {
    title: "Medicare Coverage Gaps Most Families Don't Know About",
    subtitle:
      "The hospital and rehab questions that cost families $10K to $30K",
    pageCount: 17,
    pdfUrl:
      "https://rigginsstrategicsolutions.com/downloads/medicare-coverage-gaps.pdf",
    // Title is too long to default — would render "Your Medicare Coverage
    // Gaps Most Families Don't Know About guide is here, Ryan". Shorten
    // for both subject and intro bold so the email reads naturally.
    // Subject: "Your Medicare Coverage Gaps guide is here, Ryan"
    subjectBase: "Medicare Coverage Gaps guide",
    // Intro bolded phrase: "Your Medicare Coverage Gaps guide is ready..."
    introBase: "Medicare Coverage Gaps",
    // introTrailing defaults to " guide" — keep default
  },
};

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
// PDF lives on the post-activation Blueprint dashboard.
//
// May-18 lead-magnet flow (`magnetSlug` arg): /guides signups for a
// specific PDF (e.g. Cash Buyer Beware) get a magnet-aware version of
// this email — subject names the magnet, body adds a "direct PDF link
// as backup" section per the protection-guide funnel spec. Primary CTA
// stays the activation button (drives dashboard discovery of bonus
// modules + tools).
export async function sendFreeGuideEmail(args: {
  to: string;
  firstName?: string | null;
  activationToken: string;
  /** Kept for forward compatibility; PDF is no longer linked from this email.
   *  See dashboard/page.tsx for the post-activation PDF download. */
  pdfUrl?: string;
  /** Optional lead-magnet slug (kebab-case). When set + matched in
   *  LEAD_MAGNET_EMAIL_META, the email renders the magnet-aware
   *  template with subject + body referencing that specific PDF. */
  magnetSlug?: string;
}): Promise<SendResult> {
  void args.pdfUrl;
  const magnetMeta = args.magnetSlug
    ? LEAD_MAGNET_EMAIL_META[args.magnetSlug]
    : undefined;
  if (args.magnetSlug && !magnetMeta) {
    console.warn(
      `[freeguide-email] unknown magnetSlug=${args.magnetSlug}, falling back to standard template`
    );
  }
  // Subject base: per-magnet override (e.g. "Crisis Playbook") or default
  // to "<title> guide" (e.g. "Cash Buyer Beware guide"). firstName appended
  // when present so we never render a trailing comma.
  const magnetSubjectBase = magnetMeta
    ? magnetMeta.subjectBase ?? `${magnetMeta.title} guide`
    : null;
  const subject = magnetSubjectBase
    ? args.firstName
      ? `Your ${magnetSubjectBase} is here, ${args.firstName}`
      : `Your ${magnetSubjectBase} is here`
    : args.firstName
    ? `Your Simple Blueprint is here, ${args.firstName}`
    : "Your Simple Blueprint is here";
  const firstName = args.firstName ?? "there";
  const activateUrl =
    `${SITE.url}/activate?token=${encodeURIComponent(args.activationToken)}` +
    `&email=${encodeURIComponent(args.to)}`;

  // Magnet-aware intro line + bonus PDF download block. When magnetMeta
  // is present, the opening paragraph references the specific PDF the
  // user signed up for and a "backup direct download" link appears just
  // below the activation CTA. The activation button stays the primary
  // CTA because the dashboard surfaces both PDFs + Module 00 + tools
  // after activation — bigger conversion target than the PDF alone.
  // Intro bolded phrase: per-magnet override (e.g. "When Mom Falls Crisis
  // Playbook") or default to the magnet title (e.g. "Cash Buyer Beware").
  // introTrailing controls whether " guide" appears between the bolded
  // phrase and " is ready" (yes for CBB/Aging, no for Crisis Playbook
  // where "Playbook" already implies the doc type).
  const introBoldPhrase = magnetMeta
    ? magnetMeta.introBase ?? magnetMeta.title
    : null;
  const introTrailing = magnetMeta
    ? magnetMeta.introTrailing ?? " guide"
    : "";
  const introHtml = magnetMeta
    ? `<p>Hi ${firstName},</p>
  <p>Your <strong>${introBoldPhrase}</strong>${introTrailing} is ready, and so is your free Blueprint account. One click activates everything — the guide PLUS:</p>`
    : `<p>Hi ${firstName},</p>
  <p>Your free Blueprint account is ready. One click activates everything:</p>`;

  // KILLED 2026-05-26: the magnet-backup PDF link removed because it was the
  // single biggest leak in the magnet activation funnel. Data from May 1-25
  // showed 12 of 12 cash-buyer-beware leads + 1 of 1 medicare-coverage-gaps
  // lead failed to activate (0% rate) versus the starter-guide funnel at 23%.
  // The competing PDF link satisfied the user's need (get the PDF) and removed
  // any incentive to complete activation. Same pattern fixed for starter-guide
  // on 2026-05-15 (see body redesign comment ~L206). PDF now lives behind
  // activation, surfaced on the dashboard for all magnet signups.
  const magnetBackupHtml = "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 24px;">

  ${introHtml}

  <ul style="line-height: 1.7; padding-left: 20px;">
    <li>The online interactive Module 00 + 7-day Quick Start checklist</li>
    <li>Three free interactive tools: Starting Point Assessment, Net Proceeds Calculator, and the 7-Day Quick Start tracker</li>
    <li>A 14-day Premium+ trial of the SeniorSafe app on iPhone, Android, and web (same login)</li>
    <li>Maggie, the AI transition specialist trained on the full Blueprint methodology</li>
  </ul>

  <p style="text-align: center; margin: 36px 0;">
    <a href="${activateUrl}" style="background: #B36B3A; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 16px;">Activate my free account</a>
  </p>

  ${magnetBackupHtml}

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

  // Plain-text fallback. Magnet-aware variants mirror the HTML structure.
  // Plain-text mirror of introHtml using the same per-magnet overrides.
  const introText = magnetMeta
    ? `Your ${introBoldPhrase}${introTrailing} is ready, and so is your free Blueprint account. One click activates everything — the guide PLUS:`
    : "Your free Blueprint account is ready. One click activates everything:";

  const magnetBackupText = magnetMeta
    ? `\nOr grab the ${magnetMeta.title} PDF directly: ${magnetMeta.pdfUrl}\n`
    : "";

  const text = `Hi ${firstName},

${introText}

- The online interactive Module 00 + 7-day Quick Start checklist
- Three free interactive tools: Starting Point Assessment, Net Proceeds Calculator, and the 7-Day Quick Start tracker
- A 14-day Premium+ trial of the SeniorSafe app on iPhone, Android, and web (same login)
- Maggie, the AI transition specialist trained on the full Blueprint methodology

Activate my free account: ${activateUrl}
${magnetBackupText}
You'll set a password on the next screen. The same password also works in the SeniorSafe app on your phone, so you only need to remember one.

Activation link is good for 7 days.

The SeniorSafe app trial includes daily wellness check-ins, secure document vault, private family messaging, and Maggie. No card, no extra signup. Trial is automatic — when it ends you can pick a paid plan or just stop using the app, no charges either way.

Ryan Riggins
Riggins Strategic Solutions
(336) 553-8933
`;

  return send({ to: args.to, subject, html, text });
}

// Blueprint Map ($9.99) welcome email. Sent by the stripe webhook (tier=map
// branch) right after purchase. The map buyer now gets a real Blueprint account,
// so this LEADS with the dashboard (one-click magic login) where their map, the
// locked modules, the free guides, and the SeniorSafe trial all live, and keeps
// the direct token map link at the BOTTOM as a no-login fallback.
export async function sendMapAccessEmail(args: {
  to: string;
  firstName?: string | null;
  /** One-click magic-login to the Blueprint dashboard (primary CTA). */
  loginUrl?: string;
  /** Direct token link to the mindmap (secondary, at the bottom). */
  accessUrl: string;
}): Promise<SendResult> {
  const greeting = args.firstName ? `Hi ${args.firstName},` : "Hi,";
  const subject = "Your Blueprint Map is unlocked";
  const dashboardUrl = `${SITE.url}/dashboard`;
  const ctaUrl = args.loginUrl ?? dashboardUrl;
  const fallbackHtml = args.loginUrl
    ? `<p style="font-size:13px;color:#666;">That button logs you in automatically and expires after a while. You can always sign in later at <a href="${dashboardUrl}">${dashboardUrl}</a>.</p>`
    : "";
  const html = `
    <p>${greeting}</p>
    <p>Thank you. Your Blueprint Map is unlocked, and I set up a free account for you so everything lives in one place.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${ctaUrl}" style="background:#1F3A5F;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;font-size:16px;">Open your dashboard</a>
    </p>
    ${fallbackHtml}
    <p>Inside your dashboard you will find:</p>
    <ul>
      <li><strong>Your interactive Blueprint Map</strong>, all 19 module video lessons and plain-English summaries.</li>
      <li><strong>Module 0 unlocked</strong>, with the rest of the modules ready to unlock with the full Blueprint.</li>
      <li><strong>Your free protection guides</strong>, the Simple Blueprint plus the family decision guides.</li>
      <li><strong>A 14-day SeniorSafe trial</strong>, the family-coordination app with Maggie.</li>
    </ul>
    <p>Start with Module 0. It lays out the whole path in about 15 minutes.</p>
    <p>If you get stuck, just reply to this email. I read every one.</p>
    <p>Ryan<br><span style="color:#888;font-size:12px;">Riggins Strategic Solutions</span></p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0;" />
    <p style="font-size:12px;color:#888;">Prefer to jump straight to the map without logging in? Use your private link: <a href="${args.accessUrl}" style="word-break:break-all;color:#1F3A5F;">${args.accessUrl}</a></p>
  `;
  const fallbackText = args.loginUrl
    ? `\n(That link logs you in automatically and expires after a while. You can always sign in later at ${dashboardUrl})\n`
    : "";
  const text = `${greeting}

Thank you. Your Blueprint Map is unlocked, and I set up a free account for you so everything lives in one place.

Open your dashboard:
${ctaUrl}
${fallbackText}
Inside you will find your interactive Blueprint Map (19 video lessons and summaries), Module 0 unlocked, your free protection guides, and a 14-day SeniorSafe trial.

Start with Module 0. It lays out the whole path in about 15 minutes.

If you get stuck, just reply to this email. I read every one.

Ryan
Riggins Strategic Solutions

---
Prefer to jump straight to the map without logging in? Your private link:
${args.accessUrl}`;
  return send({ to: args.to, subject, html, text });
}

export async function sendPremiumWelcomeEmail(args: {
  to: string;
  firstName?: string | null;
  /** One-click magic-login link that lands on /dashboard. When present it is
   *  used as the primary dashboard CTA so the buyer is logged in on click. A
   *  permanent /dashboard link is always shown alongside it as a backstop (the
   *  magic link expires), and the URL is included in the plain-text part too. */
  loginUrl?: string;
}) {
  const greeting = args.firstName ? `Hi ${args.firstName},` : "Welcome,";
  const subject = "Your Premium Blueprint is ready, and so am I";
  const dashboardUrl = `${SITE.url}/dashboard`; // permanent backstop link
  const ctaUrl = args.loginUrl ?? dashboardUrl; // one-click login when available
  const calUrl = SITE.premiumCalBookingUrl;
  const intakeUrl = `${SITE.url}/api/pdf/tool-19b-premium-intake-form`;
  const fallbackHtml = args.loginUrl
    ? `<p style="font-size:13px;color:#666;">That dashboard link logs you in automatically and expires after a while. You can always sign in later at <a href="${dashboardUrl}">${dashboardUrl}</a>.</p>`
    : "";
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
      <a href="${ctaUrl}">Your dashboard is here</a>. The Premium banner at the top has the booking link too, in case you need it later.
    </p>
    ${fallbackHtml}
    <p>I will email you the day before our call. Until then, reply to this email if you need anything.</p>
    <p>Ryan</p>
    <p style="color:#888;font-size:12px;">Riggins Strategic Solutions. You have Premium support until 90 days from your purchase date.</p>
  `;
  // Explicit plain-text part so the login + dashboard URLs survive (stripHtml
  // would keep only the anchor text and drop the hrefs).
  const fallbackText = args.loginUrl
    ? `\n(That link logs you in automatically and expires after a while. You can always sign in later at ${dashboardUrl})\n`
    : "";
  const text = `${greeting}

You did not just buy the course. You bought a 60-minute working session with me, plus 90 days of email support. Thank you.

Two things to do this week:

1. Book your strategy call (60 minutes, weekdays only; pick at least a week out): ${calUrl}
2. Fill out the intake form and email it back before the call: ${intakeUrl}

Your dashboard is here: ${ctaUrl}
${fallbackText}
I will email you the day before our call. Until then, reply to this email if you need anything.

Ryan
Riggins Strategic Solutions. You have Premium support until 90 days from your purchase date.`;
  return send({ to: args.to, subject, html, text });
}
