import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bantera.app"),
  // Plain string (no template): each page already ships a self-contained,
  // brand-bearing title. This is the fallback for any page without its own.
  title: "Bantera — Learn Languages by Actually Speaking",
  description:
    "Bantera is an audio-first iOS language learning app. Listen to real spoken content cue-by-cue, record yourself for AI pronunciation feedback, and find language exchange partners.",
  applicationName: "Bantera",
  authors: [{ name: "Lisen Huang" }],
  alternates: { canonical: "/" },
  icons: { icon: "/icon.png", apple: "/icon.png", shortcut: "/favicon.ico" },
  openGraph: {
    type: "website",
    siteName: "Bantera",
    locale: "en_US",
    url: "https://bantera.app",
    title: "Bantera — Learn Languages by Actually Speaking",
    description:
      "Audio-first language learning. Listen cue-by-cue, record and compare pronunciation with AI, and find language exchange partners.",
    // og:image is supplied by the app/opengraph-image.tsx file convention.
  },
  twitter: {
    card: "summary_large_image",
    site: "@BanteraApp",
    creator: "@BanteraApp",
    title: "Bantera — Learn Languages by Actually Speaking",
    description: "Audio-first language learning on iOS.",
    // twitter:image falls back to the og:image from opengraph-image.tsx.
  },
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://bantera.app/#organization",
  name: "Bantera",
  url: "https://bantera.app",
  logo: "https://bantera.app/icon.png",
  email: "contact@bantera.app",
  founder: { "@type": "Person", name: "Lisen Huang" },
  sameAs: [
    "https://x.com/BanteraApp",
    "https://apps.apple.com/app/id6761799720",
  ],
};

const webSiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://bantera.app/#website",
  name: "Bantera",
  url: "https://bantera.app",
  inLanguage: "en",
  publisher: { "@id": "https://bantera.app/#organization" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var mq=window.matchMedia('(prefers-color-scheme: dark)');function a(d){document.documentElement.classList.toggle('dark',d);}a(mq.matches);mq.addEventListener('change',function(e){a(e.matches);});})();` }} />
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationLd} />
        <JsonLd data={webSiteLd} />
        {children}
      </body>
    </html>
  );
}
