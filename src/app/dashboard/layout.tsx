import type { Metadata } from "next";

// Defense-in-depth alongside the robots.ts disallow: keep the admin dashboard
// out of search indexes even if a URL is discovered.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
