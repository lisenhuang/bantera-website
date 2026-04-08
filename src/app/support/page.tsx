import type { Metadata } from "next";
import Link from "next/link";

import { SiteLegalChrome } from "@/components/site-legal-chrome";

export const metadata: Metadata = {
  title: "Support — Bantera",
  description:
    "Get help with Bantera. Contact the developer and find answers to common questions.",
};

export default function SupportPage() {
  return (
    <SiteLegalChrome activePage="support">
      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
          Support
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-10">
          We&apos;re here to help you get the most out of Bantera.
        </p>

        <div className="space-y-10 text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Contact us
            </h2>
            <p>
              For questions, feedback, or bug reports, email us at{" "}
              <a
                href="mailto:contact@bantera.app"
                className="text-orange-600 dark:text-orange-400 font-semibold underline underline-offset-2"
              >
                contact@bantera.app
              </a>
            </p>
            <p className="font-mono text-sm bg-gray-100 dark:bg-white/5 rounded-lg px-4 py-3 border border-gray-200 dark:border-white/10">
              contact@bantera.app
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              We aim to respond within a few business days, though it may take
              longer during busy periods.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Developer
            </h2>
            <p>
              Bantera is developed by <strong className="text-gray-900 dark:text-white">Lisen Huang</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Privacy
            </h2>
            <p>
              For how we handle your data, read our{" "}
              <Link
                href="/privacy"
                className="text-orange-600 dark:text-orange-400 font-medium underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </SiteLegalChrome>
  );
}
