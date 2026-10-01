"use client";

import { useEffect, useState } from "react";
import { GITHUB_REPOSITORIES_URL } from "./github-link";
import styles from "./github.module.css";

export function GitHubForward() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    // Keep the HTTP response as HTML so link unfurlers can read our metadata.
    // replace() also prevents Back from trapping visitors in a redirect loop.
    const timer = window.setTimeout(() => {
      window.location.replace(GITHUB_REPOSITORIES_URL);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [paused]);

  return (
    <div className={styles.forward}>
      <a className={styles.primaryLink} href={GITHUB_REPOSITORIES_URL}>
        Open GitHub <span aria-hidden="true">↗</span>
      </a>
      <div className={styles.forwardStatus}>
        <span role="status">{paused ? "Take a look around." : "Opening GitHub in a moment…"}</span>
        {!paused && <button type="button" onClick={() => setPaused(true)}>Stay here</button>}
      </div>
      <noscript>Automatic opening requires JavaScript. Select Open GitHub to continue.</noscript>
    </div>
  );
}
