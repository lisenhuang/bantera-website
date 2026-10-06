'use client';

import { useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { androidRelease } from '@/lib/android-release';
import { APP_STORE_URL, DOWNLOAD_URL } from '@/lib/site-content';
import { getDownloadPlatform, type DownloadPlatform } from '@/lib/download-platform';
import styles from './download.module.css';

function subscribeToHtmlClass(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

const getDarkSnapshot = () => document.documentElement.classList.contains('dark');
const getDarkServerSnapshot = () => false;
// Device identity does not change during a page visit. Touch points distinguish
// iPadOS Safari's desktop user agent from an actual Mac.
const subscribeToPlatform = () => () => {};
const getPlatformSnapshot = () => getDownloadPlatform(navigator.userAgent, navigator.maxTouchPoints);

function SunIcon() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 384 512" className="w-5 h-5 fill-current">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67c-.19-.29-.57-.38-.86-.22-.3.16-.42.54-.26.85L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}


const waveHeights = [18, 30, 22, 44, 58, 36, 24, 48, 68, 42, 28, 52, 74, 50, 32, 60, 42, 24, 46, 64, 36, 22, 48, 30, 18];

function PracticePreview() {
  return (
    <div className={styles.preview} role="img" aria-label="Listen, repeat, and find your voice with Bantera">
      <div className={styles.previewHeading}><span>YOUR NEXT CONVERSATION</span><span>Starts here ↗</span></div>
      <div className={styles.phrase}>“A little practice.<br /><em>A lot more confidence.</em>”</div>
      <div className={styles.audioRow} aria-hidden="true">
        <span className={styles.play}>▶</span>
        <div className={styles.wave}>{waveHeights.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
        <span className={styles.audioLabel}>Listen.<br />Make it yours.</span>
      </div>
      <div className={styles.previewFooter}><span>Listen → Repeat → Record</span><span>One cue at a time</span></div>
    </div>
  );
}

export default function DownloadPageClient({ initialPlatform }: { initialPlatform: DownloadPlatform }) {
  const isDark = useSyncExternalStore(subscribeToHtmlClass, getDarkSnapshot, getDarkServerSnapshot);
  const platform = useSyncExternalStore(subscribeToPlatform, getPlatformSnapshot, () => initialPlatform);
  const handheld = platform !== 'desktop';
  const deviceLabel = platform === 'android' ? 'Android' : platform === 'ipad' ? 'iPad' : 'iPhone';

  return (
    <div className={styles.page} data-handheld={handheld} data-platform={platform}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Bantera home">
          <Image src="/icon.png" alt="" width={36} height={36} priority />
          <span>Bantera</span>
        </Link>
        <div className={styles.headerActions}>
          <Link href="/webapp">Try in your browser <span aria-hidden="true">↗</span></Link>
          <button onClick={() => document.documentElement.classList.toggle('dark')} aria-label={isDark ? 'Use light theme' : 'Use dark theme'} className={styles.theme}>
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.story} aria-labelledby="download-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}><span />30+ languages. Your voice.</p>
            <h1 id="download-title">A little more practice.<br /><span>A little more you.</span></h1>
            <p className={styles.description}>Build the confidence to speak. Listen to real conversations, then make the words your own.</p>
          </div>
          <PracticePreview />
          <ul className={styles.features}>
            <li><span aria-hidden="true">✓</span>Listen and repeat, one cue at a time</li>
            <li><span aria-hidden="true">✓</span>Record your voice and compare</li>
            <li><span aria-hidden="true">✓</span>Connect with language exchange partners</li>
          </ul>
        </section>

        <section className={styles.install} aria-label="Download Bantera">
          {!handheld && <div className={styles.scan}>
            <p className={styles.scanEyebrow}>TAKE BANTERA WITH YOU</p>
            <h2>Your next conversation<br />is one scan away.</h2>
            <p>Open your phone’s camera and scan<br />to choose your download.</p>
            <a href={DOWNLOAD_URL} className={styles.qr} aria-label="Download Bantera for iOS or Android">
              <QRCodeSVG value={DOWNLOAD_URL} size={188} level="M" marginSize={4} title="Scan to open bantera.app/download" />
            </a>
            <span className={styles.scanUrl}>bantera.app/download</span>
            <div className={styles.divider}><span>Or choose your platform</span></div>
          </div>}
          <div className={styles.downloadBar}>
            <p className={styles.deviceNote}>{handheld ? <>Ready for your <strong>{deviceLabel}</strong></> : 'Available on iPhone, iPad & Android'}</p>
            <div className={styles.buttons}>
              <a href={APP_STORE_URL} className={styles.storeButton} data-recommended={platform === 'ios' || platform === 'ipad'} aria-label="Download Bantera on the App Store for iPhone and iPad">
                <AppleIcon /><span><small>Download on the</small><strong>App Store</strong></span>
              </a>
              <a href="/bantera.apk" download className={styles.storeButton} data-recommended={platform === 'android'} aria-label={`Download Bantera Android APK version ${androidRelease.version}`}>
                <AndroidIcon /><span><small>Download APK for</small><strong>Android</strong></span>
              </a>
            </div>
            <p className={styles.release}>Android {androidRelease.version} · Android 7.0+ <span>·</span> <Link href="/privacy">Privacy</Link><span>·</span><button onClick={() => window.dispatchEvent(new Event('bantera:analytics-preferences'))}>Analytics</button></p>
          </div>
        </section>
      </main>
      <footer className={styles.footer}><span>Listen closer. Speak freely.</span><Link href="/support">Need a hand? <span aria-hidden="true">↗</span></Link></footer>
    </div>
  );
}
