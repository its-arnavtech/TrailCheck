import type { Metadata } from "next";
import Link from "next/link";
import PageNavbar from "@/components/page-navbar";

export const metadata: Metadata = {
  title: "Privacy Policy | TrailCheck",
  description:
    "How TrailCheck collects, uses, shares, protects, and retains personal information.",
};

const effectiveDate = "May 27, 2026";

const sections = [
  {
    title: "1. Scope",
    body: [
      "This Privacy Policy applies to the TrailCheck website, web app, API-backed account features, trail report features, saved park features, password reset flow, and safety digest features. By using TrailCheck, you acknowledge that TrailCheck will collect and use information as described in this policy.",
      "TrailCheck is built for visitors planning and reviewing national park conditions. It is not emergency, medical, rescue, or legal advice, and privacy choices should not be used as a substitute for official park guidance.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "Account information: email address, password hash, account identifier, account creation date, age, gender selection, password version, and password reset token hashes and expiration times when you request a reset.",
      "Trail and park activity: trail reports you submit, including condition rating, surface condition, optional notes, creation time, the trail involved, and the email associated with the submitting account as the reporter name. We also store saved park preferences, including favorites and want-to-go lists.",
      "Device, log, and security information: IP address or forwarded IP address, request metadata, dates and times, authentication status, and similar operational records used for security, abuse prevention, rate limiting, diagnostics, and service reliability.",
      "Local browser storage: TrailCheck stores your authentication token and signed-in user record in your browser localStorage so the app can keep you signed in until the token expires or you sign out.",
      "Third-party source data: TrailCheck uses National Park Service alert data, National Weather Service forecast data, DeepSeek or local model output when configured, map data, and Resend email delivery when password reset email delivery is enabled.",
    ],
  },
  {
    title: "3. How We Use Information",
    body: [
      "We use personal information to create and secure accounts, authenticate sessions, submit and display trail reports, enforce daily report limits, maintain saved park preferences, provide password resets, respond to support requests, prevent abuse, operate the service, troubleshoot errors, and improve TrailCheck.",
      "We use park alerts, weather, trail, report, and model-generated data to present safety digests, hazards, route context, and planning information. We do not use your account information to make automated decisions with legal or similarly significant effects.",
    ],
  },
  {
    title: "4. Sharing and Disclosure",
    body: [
      "Public content: trail reports may be displayed to other TrailCheck users and visitors. Do not include sensitive personal information in report notes.",
      "Service providers: we may share limited information with providers that host the app, operate databases, deliver password reset emails, provide model or map functionality, or support security, logging, and infrastructure. These providers may process information only as needed to provide their services to TrailCheck.",
      "Legal and safety reasons: we may disclose information if required by law, legal process, enforceable government request, or when reasonably necessary to protect TrailCheck, users, visitors, or the public.",
      "No sale of personal information: TrailCheck does not sell personal information and does not share personal information for cross-context behavioral advertising.",
    ],
  },
  {
    title: "5. Retention",
    body: [
      "We keep account information while your account is active or as needed to operate TrailCheck, comply with law, resolve disputes, prevent abuse, and enforce this policy. Password reset tokens are stored as hashes and expire according to the configured reset window.",
      "Trail reports and saved park preferences are retained until they are deleted, de-identified, or no longer needed for TrailCheck. Operational logs and rate-limit records are retained for a limited period based on security, debugging, and infrastructure needs.",
    ],
  },
  {
    title: "6. Security",
    body: [
      "TrailCheck uses reasonable administrative, technical, and organizational safeguards appropriate for a small web service, including password hashing, reset-token hashing, authenticated API routes, request validation, rate limiting, and transport security where deployed. No internet service can guarantee perfect security.",
      "You are responsible for keeping your password and devices secure. Sign out on shared devices and contact us if you believe your account or report history has been accessed without permission.",
    ],
  },
  {
    title: "7. Your Choices and Rights",
    body: [
      "You can sign out to remove the active session from localStorage. You can request account access, correction, deletion, or a copy of personal information by contacting us at its.arnavk.here@gmail.com. We may need to verify your identity before acting on a request.",
      "Depending on where you live, you may have additional rights to know, access, correct, delete, download, opt out of certain processing, or appeal a privacy decision. TrailCheck will honor legally required rights that apply to your request.",
    ],
  },
  {
    title: "8. Children",
    body: [
      "TrailCheck is not directed to children under 13, and accounts may only be created by users who are at least 13 years old. If you believe a child under 13 provided personal information to TrailCheck, contact us and we will take reasonable steps to delete it.",
    ],
  },
  {
    title: "9. International Use",
    body: [
      "TrailCheck is operated from the United States. If you use TrailCheck from another country, you understand that your information may be processed in the United States or other locations where service providers operate.",
    ],
  },
  {
    title: "10. Changes",
    body: [
      "We may update this policy as TrailCheck changes. The effective date at the top tells you when the current version took effect. Material changes will be posted on this page, and continued use of TrailCheck after a posted update means the updated policy applies going forward.",
    ],
  },
  {
    title: "11. Contact",
    body: [
      "Questions, privacy requests, or complaints can be sent to its.arnavk.here@gmail.com. Please include enough detail for us to understand and respond to your request.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen pb-10">
      <PageNavbar />
      <div className="section-shell flex flex-col gap-8 pt-6 sm:pt-8">
        <section className="glass-panel topo-ring rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]/70">
              TrailCheck
            </p>
            <h1
              id="main-content"
              tabIndex={-1}
              className="mt-4 text-5xl text-ink sm:text-6xl"
              data-display="true"
            >
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm font-semibold text-ink/72">
              Effective date: {effectiveDate}
            </p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-ink/74">
              This policy is written to match how TrailCheck currently works:
              accounts, saved parks, trail reports, password resets, operational
              logs, and safety digest integrations.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <aside className="glass-panel topo-ring h-fit rounded-[1.75rem] p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]/72">
              Quick Read
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ink/70">
              <p>Trail reports may be public.</p>
              <p>Account sessions are stored in browser localStorage.</p>
              <p>TrailCheck does not sell personal information.</p>
              <p>
                Contact support for access, correction, deletion, or privacy
                questions.
              </p>
            </div>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center rounded-full border border-ink/12 bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-ink/82 transition hover:bg-[var(--surface-muted)] hover:text-ink"
            >
              Back home
            </Link>
          </aside>

          <div className="space-y-4">
            {sections.map((section) => (
              <article
                key={section.title}
                className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6"
              >
                <h2 className="text-2xl text-ink" data-display="true">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-ink/72 sm:text-base sm:leading-8">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
