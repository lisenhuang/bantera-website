import type { Metadata } from "next";
import Link from "next/link";

import { SiteLegalChrome } from "@/components/site-legal-chrome";

export const metadata: Metadata = {
  title: "Delete your account — Bantera",
  description:
    "How to delete your Bantera account and associated data, including what is removed, what is kept, and how to request deletion.",
  alternates: { canonical: "/delete-account" },
};

export default function DeleteAccountPage() {
  return (
    <SiteLegalChrome>
      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: June 21, 2026
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
          Delete your Bantera account
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-10">
          This page explains how to delete your account and associated data in{" "}
          <strong className="text-gray-900 dark:text-white">Bantera</strong>,
          the audio-first language learning app developed by{" "}
          <strong className="text-gray-900 dark:text-white">Lisen Huang</strong>.
        </p>

        <div className="space-y-10 text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
          {/* In-app deletion (preferred) */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete your account in the app
            </h2>
            <p>
              The fastest way to delete your account is from inside the Bantera
              app. Your account is removed{" "}
              <strong className="text-gray-900 dark:text-white">
                immediately
              </strong>{" "}
              and cannot be recovered.
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Open Bantera and make sure you are signed in.</li>
              <li>
                Go to <strong className="text-gray-900 dark:text-white">Settings</strong>{" "}
                (the profile / settings screen).
              </li>
              <li>
                Tap <strong className="text-gray-900 dark:text-white">More</strong>.
              </li>
              <li>
                Tap{" "}
                <strong className="text-gray-900 dark:text-white">
                  Delete account
                </strong>
                .
              </li>
              <li>
                Type <span className="font-mono">DELETE</span> to confirm, then
                tap <strong className="text-gray-900 dark:text-white">Continue</strong>.
              </li>
              <li>
                Confirm one more time. Your account and server-side data are then
                deleted immediately.
              </li>
            </ol>
          </section>

          {/* Email request (fallback) */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Request deletion by email
            </h2>
            <p>
              If you can no longer access the app, you can ask us to delete your
              account on your behalf. Email{" "}
              <a
                href="mailto:contact@bantera.app?subject=Account%20deletion%20request"
                className="text-orange-600 dark:text-orange-400 font-semibold underline underline-offset-2"
              >
                contact@bantera.app
              </a>{" "}
              from the email address associated with your account, with the
              subject <em>&ldquo;Account deletion request&rdquo;</em>.
            </p>
            <p className="font-mono text-sm bg-gray-100 dark:bg-white/5 rounded-lg px-4 py-3 border border-gray-200 dark:border-white/10">
              contact@bantera.app
            </p>
            <p>
              So we can verify the request, please send it from the account
              email and include any display name or sign-in method (for example,
              email or Sign in with Apple) you used. We will confirm and complete
              the deletion within{" "}
              <strong className="text-gray-900 dark:text-white">30 days</strong>.
            </p>
          </section>

          {/* What is deleted */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              What data is deleted
            </h2>
            <p>
              When your account is deleted, we permanently remove the personal
              data we hold on our servers for that account, including:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Account and authentication data
                </strong>{" "}
                — identifiers and credentials such as your email address or Sign
                in with Apple identifier.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Profile and preferences
                </strong>{" "}
                — display name, avatar image, and language preferences (native
                and learning languages).
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Content you created
                </strong>{" "}
                — audio or video you uploaded, transcripts and cues, titles, and
                visibility settings stored with your account.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Account-related activity
                </strong>{" "}
                — messages, exchanges, and other server-side records tied to your
                account.
              </li>
            </ul>
          </section>

          {/* What is kept */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              What is kept, and for how long
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Data stored only on your device.
                </strong>{" "}
                Some learning data — such as practice comparison recordings and
                practice progress — is stored locally on your device and is not
                sent to our servers. Deleting your account does not remove it; to
                delete this data, clear the app&apos;s storage or uninstall the
                app.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Backups.
                </strong>{" "}
                Residual copies may remain in encrypted backups for a limited
                period and are removed on our normal backup rotation, typically
                within 30 days.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Records we must keep.
                </strong>{" "}
                We may retain a limited amount of information where required to
                comply with legal obligations, resolve disputes, prevent fraud
                and abuse, or enforce our terms, for only as long as needed for
                those purposes.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <p>
              For more detail on how we handle your information, see our{" "}
              <Link
                href="/privacy"
                className="text-orange-600 dark:text-orange-400 font-semibold underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              . For other questions, visit{" "}
              <Link
                href="/support"
                className="text-orange-600 dark:text-orange-400 font-semibold underline underline-offset-2"
              >
                Support
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </SiteLegalChrome>
  );
}
