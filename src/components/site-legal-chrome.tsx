import Link from "next/link";

type ActivePage = "privacy" | "support";

export function SiteLegalChrome({
  activePage,
  children,
}: {
  activePage?: ActivePage;
  children: React.ReactNode;
}) {
  const linkClass = (page: ActivePage) =>
    `text-sm font-medium transition-colors ${
      activePage === page
        ? "text-orange-600 dark:text-orange-400"
        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans antialiased transition-colors duration-300">
      <nav className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-4 px-6 md:px-12 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10">
        <Link
          href="/"
          className="text-xl font-black tracking-tight text-gray-900 dark:text-white hover:opacity-90"
        >
          Bantera
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className={linkClass("privacy")}>
            Privacy
          </Link>
          <Link href="/support" className={linkClass("support")}>
            Support
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
