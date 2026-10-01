import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GitHubForward } from "./github-forward";
import styles from "./github.module.css";

const title = "Bantera on GitHub | Frontend, Backend & Mobile";
const description = "Explore the code behind Bantera: a Next.js frontend, C#/.NET backend and Flutter apps for iOS and Android. AI-powered listening and speaking practice.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/github" },
  robots: { index: false, follow: true },
  openGraph: {
    title,
    description,
    url: "https://bantera.app/github",
    siteName: "Bantera",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description, images: ["/github/opengraph-image"] },
};

const repositories = [
  { number: "01", name: "Frontend", file: "bantera-website", stack: "Next.js · React · TypeScript", detail: "From the first visit to the next practice session.", color: "#ffab76", icon: "</>" },
  { number: "02", name: "Backend", file: "bantera-backend", stack: "C# / .NET · PostgreSQL", detail: "The APIs and AI workflows behind the experience.", color: "#baabff", icon: "{ }" },
  { number: "03", name: "iOS & Android", file: "bantera-app", stack: "Flutter · Dart · iOS CallKit", detail: "Listening, speaking and real human connection.", color: "#80d7c6", icon: "▯" },
];

export default function GitHubPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Bantera homepage">
          <Image src="/icon.png" alt="" width={36} height={36} />
          Bantera<span className={styles.brandDot}>.</span>
        </Link>
        <Link href="/" className={styles.homeLink}>Homepage <span aria-hidden="true">↗</span></Link>
      </header>
      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="github-heading">
          <p className={styles.eyebrow}><span /> Behind Bantera</p>
          <h1 id="github-heading">One product.<br /><span>Three codebases.</span></h1>
          <p className={styles.description}>A closer look at the code behind AI-powered listening and speaking practice. Built for the web, iOS and Android.</p>
          <GitHubForward />
          <div className={styles.signature}>
            <Image src="/brand/github-lockup-white.svg" alt="GitHub" width={100} height={28} />
            <span>Explore the Bantera repositories</span>
          </div>
        </section>
        <section className={styles.codePanel} aria-label="The Bantera codebases">
          <div className={styles.panelHeader}>
            <div className={styles.windowDots} aria-hidden="true"><i /><i /><i /></div>
            <span>bantera / codebases</span>
            <span className={styles.repoCount}>03</span>
          </div>
          <div className={styles.repoList}>
            {repositories.map((repo) => (
              <article className={styles.repo} key={repo.file}>
                <div className={styles.repoTop}>
                  <span className={styles.repoIcon} style={{ color: repo.color }} aria-hidden="true">{repo.icon}</span>
                  <span className={styles.repoNumber}>{repo.number}</span>
                </div>
                <h2>{repo.name}</h2>
                <p className={styles.repoFile}>{repo.file}</p>
                <p className={styles.repoDetail}>{repo.detail}</p>
                <p className={styles.repoStack}><span style={{ backgroundColor: repo.color }} />{repo.stack}</p>
              </article>
            ))}
          </div>
          <div className={styles.panelFooter}><span aria-hidden="true">↳</span> Designed, built and connected.</div>
        </section>
      </main>
      <footer className={styles.footer}><span>Language practice. Human connection.</span><span>bantera.app / github</span></footer>
    </div>
  );
}
