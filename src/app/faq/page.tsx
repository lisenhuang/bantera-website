import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { FAQS } from "@/lib/site-content";
import { SiteLegalChrome } from "@/components/site-legal-chrome";

export const metadata: Metadata = {
  title: "FAQ — Bantera",
  description:
    "Frequently asked questions about Bantera: supported languages, how speaking practice and AI pronunciation feedback work, language exchange, and platform availability.",
  alternates: { canonical: "/faq" },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://bantera.app/faq#faqpage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <SiteLegalChrome activePage="faq">
      <JsonLd data={faqLd} />
      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
          Frequently asked questions
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-10">
          Everything you need to know about learning languages with Bantera.
        </p>
        <dl className="space-y-8">
          {FAQS.map((f) => (
            <div
              key={f.q}
              className="border-b border-gray-100 dark:border-white/10 pb-8 last:border-0"
            >
              <dt className="text-lg font-bold text-gray-900 dark:text-white">
                {f.q}
              </dt>
              <dd className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </main>
    </SiteLegalChrome>
  );
}
