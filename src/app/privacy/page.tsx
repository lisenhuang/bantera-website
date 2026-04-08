import type { Metadata } from "next";
import Link from "next/link";

import { SiteLegalChrome } from "@/components/site-legal-chrome";

export const metadata: Metadata = {
  title: "Privacy Policy — Bantera",
  description:
    "How Bantera collects, uses, and protects your information when you use our language learning app and services.",
};

export default function PrivacyPage() {
  return (
    <SiteLegalChrome activePage="privacy">
      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: April 8, 2026
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
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
                progress) as implemented in the app.
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
              updated&rdquo; date. Continued use of Bantera after changes means
              you accept the updated policy, to the extent permitted by law.
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
