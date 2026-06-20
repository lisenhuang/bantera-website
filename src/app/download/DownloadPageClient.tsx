'use client';

import { useSyncExternalStore } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { androidRelease } from '@/lib/android-release';

const APP_STORE_URL = 'https://apps.apple.com/app/id6761799720';

function subscribeToHtmlClass(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function getDarkSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function getDarkServerSnapshot(): boolean {
  return false;
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67c-.19-.29-.57-.38-.86-.22-.3.16-.42.54-.26.85L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

export default function DownloadPageClient() {
  const isDark = useSyncExternalStore(subscribeToHtmlClass, getDarkSnapshot, getDarkServerSnapshot);

  function toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans antialiased transition-colors duration-300">

      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
        >
          {isDark === null ? null : isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-orange-500/8 dark:bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-violet-500/6 dark:bg-violet-500/10 blur-3xl" />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        <div className="w-full max-w-sm flex flex-col items-center gap-8">

          {/* App icon + name */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-[2.5rem] bg-linear-to-br from-orange-400/30 to-violet-500/20 blur-2xl scale-110" />
              <Image
                src="/icon.png"
                alt="Bantera app icon"
                width={100}
                height={100}
                className="relative rounded-4xl shadow-2xl"
                priority
              />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                Bantera
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Language speaking &amp; listening practice
              </p>
            </div>
          </div>

          {/* App description */}
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
            Listen to real spoken content cue-by-cue, record yourself to compare pronunciation,
            and find language exchange partners who speak what you want to learn.
          </p>

          {/* QR code card */}
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 inline-flex flex-col items-center gap-3">
              <QRCodeSVG
                value={APP_STORE_URL}
                size={200}
                level="H"
                imageSettings={{
                  src: '/apple-logo.svg',
                  height: 44,
                  width: 44,
                  excavate: true,
                }}
              />
              <p className="text-xs font-semibold text-gray-600 tracking-wide">
                Scan to download
              </p>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Use your <span className="font-semibold text-gray-700 dark:text-gray-300">iPhone or iPad</span> camera to scan
              <br />
              the QR code and download the app.
            </p>
          </div>

          {/* App Store button — always visible */}
          <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 w-full px-8 py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-base hover:scale-105 active:scale-95 transition-transform shadow-xl"
            >
              <AppleIcon />
              Download on the App Store
            </a>

          {/* Android APK download */}
          <div className="flex flex-col items-center gap-2 w-full">
            <a
              href="/bantera.apk"
              download
              className="inline-flex items-center justify-center gap-3 w-full px-8 py-4 rounded-2xl bg-green-600 text-white font-bold text-base hover:scale-105 active:scale-95 transition-transform shadow-xl"
            >
              <AndroidIcon />
              Download for Android
            </a>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              APK · Version {androidRelease.version} · Android 7.0+
            </p>
          </div>

          {/* Available on badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30">
              Available on iOS, iPadOS &amp; Android
            </span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          © {new Date().getFullYear()} Bantera · Audio-first language learning
        </p>
      </footer>
    </div>
  );
}
