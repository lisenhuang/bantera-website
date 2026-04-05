'use client';

import { useState, useEffect } from 'react';
import { testAllKeysAction, type TestAllKeysResult } from './actions';

type Result = Extract<TestAllKeysResult, { success: true }>['results'][number];

function StatusBadge({ status }: { status: 'ok' | 'failed' }) {
  return status === 'ok' ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Valid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Failed
    </span>
  );
}

export default function KeysPage() {
  const [result, setResult] = useState<TestAllKeysResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testAllKeysAction().then((r) => {
      setResult(r);
      setLoading(false);
    });
  }, []);

  const retest = () => {
    setLoading(true);
    setResult(null);
    testAllKeysAction().then((r) => {
      setResult(r);
      setLoading(false);
    });
  };

  const okKeys    = result?.success ? result.results.filter((r) => r.status === 'ok') : [];
  const failedKeys = result?.success ? result.results.filter((r) => r.status === 'failed') : [];

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,80,255,0.25),transparent)] bg-gray-950 text-white font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <a href="/test/gemini" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              ← Back to Dialogue Studio
            </a>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            API Key Tester
          </h1>
          <p className="text-gray-400 text-sm">
            Tests every key in <code className="font-mono text-violet-300">GEMINI_API_KEYS</code> against the Gemini REST API.
            Only the last 4 characters of each key are shown.
          </p>
        </div>

        {/* Env format reminder */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
            .env.local format
          </p>
          <pre className="text-sm text-gray-300 font-mono bg-black/30 rounded-xl p-4 overflow-x-auto">
{`# Comma-separated (recommended)
GEMINI_API_KEYS=AIza...key1,AIza...key2,AIza...key3

# JSON array also works
GEMINI_API_KEYS=["AIza...key1","AIza...key2"]`}
          </pre>
        </div>

        {/* Results */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Test Results
            </h2>
            <button
              onClick={retest}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-40 transition-all"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Re-test
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-gray-500">
              <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm">Testing all keys…</p>
            </div>
          )}

          {!loading && result && !result.success && (
            <div className="flex gap-3 items-start p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.268 16A2 2 0 005.07 19z" />
              </svg>
              {result.error}
            </div>
          )}

          {!loading && result?.success && (
            <>
              {/* Summary bar */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300 font-semibold">{okKeys.length} valid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-red-300 font-semibold">{failedKeys.length} failed</span>
                </div>
                <div className="text-gray-500">{result.results.length} total</div>
              </div>

              {/* Valid keys first */}
              {okKeys.length > 0 && (
                <div className="space-y-2">
                  {okKeys.map((r, i) => (
                    <KeyRow key={i} result={r} />
                  ))}
                </div>
              )}

              {/* Failed keys below */}
              {failedKeys.length > 0 && (
                <div className="space-y-2">
                  {okKeys.length > 0 && (
                    <p className="text-xs text-gray-600 uppercase tracking-widest pt-2">Failed Keys</p>
                  )}
                  {failedKeys.map((r, i) => (
                    <KeyRow key={i} result={r} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </main>
  );
}

function KeyRow({ result }: { result: Result }) {
  return (
    <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
      result.status === 'ok'
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-red-500/5 border-red-500/20'
    }`}>
      <div className="flex items-center gap-3">
        <code className="font-mono text-sm text-gray-300 bg-black/30 px-2 py-1 rounded-lg">
          ···{result.suffix}
        </code>
        <StatusBadge status={result.status} />
      </div>
      <div className="text-right text-sm">
        {result.status === 'ok' && (
          <span className="text-gray-400">{result.modelCount} models</span>
        )}
        {result.status === 'failed' && result.error && (
          <span className="text-red-400 text-xs max-w-xs text-right block truncate" title={result.error}>
            {result.error}
          </span>
        )}
      </div>
    </div>
  );
}
