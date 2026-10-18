import type { Metadata } from "next";
import Link from "next/link";

import { SiteLegalChrome } from "@/components/site-legal-chrome";

export const metadata: Metadata = {
  title: "Privacy Policy — Bantera",
  description:
    "How Bantera collects, uses, and protects your information when you use our language learning app and services.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <SiteLegalChrome activePage="privacy">
      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: October 18, 2026
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
          <section id="website-analytics" className="space-y-3">
            <h2 className="text-lg font-bold">Optional website analytics</h2>
            <p>With your permission, Bantera records public page paths, referral domains,
              campaign tags, the language of practice pages, broad device type, lesson playback,
              and clicks to the App Store or Google Play. We use this to understand how learners
              find and use the website. This records clicks, not confirmed app installations.</p>
            <p>A random session identifier is stored in this browser tab and expires after 30 minutes
              of inactivity or 24 hours. Your allow or decline choice is saved on this device for
              180 days. Change it with “Analytics preferences” at the bottom of public pages.
              Do Not Track and Global Privacy Control disable this collection.</p>
            <p>These analytics records are kept on Bantera’s backend for up to 91 days, with daily
              deletion of records older than 90 days. They contain no account identifiers,
              recordings, form text, full referral URLs, raw IP addresses, search queries, or AI
              conversation prompts. They are not linked to your mobile app activity.
              Hosting and security logs are separate from this optional analytics feature.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Introduction
            </h2>
            <p>
              Bantera (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;)
              provides an audio-first language learning application and related
              services. This Privacy Policy explains how we collect, use,
              store, and share information when you use the Bantera mobile app
              and our websites or APIs that link to this policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Information we collect
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Account and authentication.
                </strong>{" "}
                If you register or sign in, we process identifiers and
                credentials you provide (for example, email address for
                email-based sign-in, or data from Sign in with Apple as
                permitted by that service).
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Profile and preferences.
                </strong>{" "}
                Information you add to your profile, such as display name,
                avatar image, and language preferences (for example, native and
                learning languages).
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Content you create.
                </strong>{" "}
                Audio or video you upload, transcripts or cues associated with
                that content, titles, and settings such as public or private
                visibility. Content generated using our features (for example,
                AI-assisted audio) may also be stored with your account as
                described in the product.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Usage and device data.
                </strong>{" "}
                We may collect technical information needed to operate the
                service, such as app version, device type, and diagnostic or
                security-related logs. Some learning activity may be processed
                on your device and stored locally (for example, practice
                progress). For example, practice comparison recordings you make
                in the app may be stored locally on your device for replay and
                progress tracking and are not sent to Bantera&apos;s servers in
                the current implementation.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              How we use information
            </h2>
            <p>We use the information above to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, maintain, and improve Bantera&apos;s features;</li>
              <li>Authenticate you and secure your account;</li>
              <li>
                Store and display your content and preferences as you choose;
              </li>
              <li>
                Operate features that rely on our servers or partners (such as
                speech-related processing or AI-assisted generation, where
                enabled);
              </li>
              <li>Comply with law and enforce our terms.</li>
            </ul>
          </section>

          <section id="ai-services" className="space-y-3 scroll-mt-24">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              AI services and your permission
            </h2>
            <p>
              Bantera uses Google for AI conversations, lessons, speech generation,
              conversation summaries, transcript correction, and reminders. We use
              Cloudflare for AI-generated avatars and lesson cover images. In app
              version 2.18.5 and later, we explain the data and recipients and ask
              you to choose “Agree and continue” before enabling these transfers.
              Microphone or photo access alone does not grant permission to share
              content with an AI provider.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Google:</strong> Depending on the feature, we send voice
                audio, transcripts, images you attach to AI chat, prompts and lesson
                scenarios, relevant chat history and summaries, your name, native
                and learning languages, learning level, practice activity, saved
                lessons and phrases, requested vocabulary, local time and time zone,
                and reminder details. These inputs come from your submissions,
                profile, preferences, and relevant learning records on your device
                or in your Bantera account. Google processes them to understand your
                input and generate personalised replies, summaries, lessons, and speech.
              </li>
              <li>
                <strong>Cloudflare:</strong> Avatar generation sends your name,
                selected avatar gender, and language preferences as a text prompt.
                Lesson cover generation sends the lesson title and language.
                Cloudflare processes these prompts to generate images. This does
                not require sending your existing profile photo to its image model.
              </li>
            </ul>
            <p>
              These AI requests pass through Bantera’s servers. We send the data
              relevant to the requested feature, not every category for every request.
              When you use web or image search within AI chat, search queries may
              also be sent from your device to Microsoft Bing, DuckDuckGo, or Wikimedia
              Commons. Retrieved results may be sent to Google to help answer you.
              Those services and image hosts receive ordinary connection information,
              such as your IP address, when your device contacts them.
            </p>
            <p>
              Choose “Not now” to continue using features that do not need AI.
              Permission is saved for your account on this device, separately from
              chat history. You can review the disclosure and turn off future AI
              sharing in Settings &gt; AI data sharing. Turning it off stops new AI
              requests from this device and ends active AI conversations. Requests
              already sent may finish. Previously scheduled reminders can continue;
              use the reminders control on that settings page to cancel them.
              Turning off sharing does not delete data already sent or change
              permissions on another device.
            </p>
            <p>
              Received AI conversation history and its saved summary are stored on
              your device. Relevant portions are transmitted again when needed for
              a new reply or summary. Reminder schedules and notes are stored on
              Bantera’s server; generated voice reminder audio is stored until
              received or cancelled, for up to seven days. Generated lessons and
              images are stored with your account. You can clear AI chat history,
              cancel reminders, delete supported content, or request deletion through
              the contact details below.
            </p>
            <p>
              We require third parties that process personal data for Bantera to
              provide the same or an equivalent level of protection described in this
              policy, including appropriate security, confidentiality, and limits on
              use and retention. Provider processing is also subject to their
              applicable service terms. Google’s retention and service-improvement
              practices depend on the service tier: its unpaid services may use
              submitted content and responses to improve products and may involve
              human review; its paid services do not use prompts or responses for
              product improvement, but may retain them for safety and legal purposes.
              Do not include sensitive or confidential information in AI requests.
              Cloudflare states that Workers AI does not use customer content to
              train models; limited operational, security, and legal retention can
              still apply. See{' '}
              <a href="https://ai.google.dev/gemini-api/terms" className="underline underline-offset-2">Google’s AI service terms</a>,{' '}
              <a href="https://policies.google.com/privacy" className="underline underline-offset-2">Google’s Privacy Policy</a>, and{' '}
              <a href="https://developers.cloudflare.com/workers-ai/platform/data-usage/" className="underline underline-offset-2">Cloudflare’s AI data practices</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Legal bases (where applicable)
            </h2>
            <p>
              Depending on your region, we rely on appropriate bases such as
              performance of a contract, legitimate interests in operating and
              securing our service, and consent where required (for example,
              for certain optional processing or marketing, if offered).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Sharing and service providers
            </h2>
            <p>
              We may share information with vendors who help us host, analyze,
              or improve the service (for example, cloud hosting, analytics, or
              AI providers), subject to contractual protections. We do not sell
              your personal information for money. We may disclose information
              if required by law or to protect rights, safety, and security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Retention
            </h2>
            <p>
              We retain information for as long as your account is active or as
              needed to provide the service, comply with legal obligations,
              resolve disputes, and enforce our agreements. You may delete
              certain content or your account where the product allows; some
              retention may continue for backups or legal reasons.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Security
            </h2>
            <p>
              We use reasonable administrative, technical, and organizational
              measures designed to protect information. No method of
              transmission or storage is completely secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Children
            </h2>
            <p>
              Bantera is not directed at children under the age required by
              applicable law for parental consent, and we do not knowingly
              collect personal information from children in that category. If
              you believe we have collected such information, contact us and we
              will take appropriate steps.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              International users
            </h2>
            <p>
              If you use Bantera from outside the country where our servers or
              providers are located, your information may be transferred to and
              processed in those regions. We take steps designed to ensure
              appropriate safeguards where required.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will post
              the updated version on this page and change the &ldquo;Last
              updated&rdquo; date. Where a change requires new permission for
              personal-data sharing, we will ask for that permission before the
              new sharing begins. Continued use alone is not consent to AI sharing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Contact
            </h2>
            <p>
              For privacy-related questions or requests, contact us at{" "}
              <a
                href="mailto:contact@bantera.app"
                className="text-orange-600 dark:text-orange-400 font-medium underline underline-offset-2"
              >
                contact@bantera.app
              </a>
              . Bantera is developed by Lisen Huang.
            </p>
            <p>
              See also our{" "}
              <Link
                href="/support"
                className="text-orange-600 dark:text-orange-400 font-medium underline underline-offset-2"
              >
                Support
              </Link>{" "}
              page for general help.
            </p>
          </section>
        </div>
      </main>
    </SiteLegalChrome>
  );
}
