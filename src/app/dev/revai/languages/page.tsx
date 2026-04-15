'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { alignWithRevAIAction } from '../actions';

type RowState = {
  languageCode: string;
  loading: boolean;
  result: string | null;
};

function parseLanguageCodes(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function RevAILanguagesPage() {
  const STORAGE_KEY = 'revai-languages-inputs-v1';
  const hasLoadedPrefs = useRef(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [text, setText] = useState('');
  const [languageCodesInput, setLanguageCodesInput] = useState('');
  const [rows, setRows] = useState<RowState[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          audioUrl?: string;
          text?: string;
          languageCodesInput?: string;
        };
        if (typeof saved.audioUrl === 'string') setAudioUrl(saved.audioUrl);
        if (typeof saved.text === 'string') setText(saved.text);
        if (typeof saved.languageCodesInput === 'string') setLanguageCodesInput(saved.languageCodesInput);
      }
    } catch {
      // Ignore bad or unavailable local storage.
    } finally {
      hasLoadedPrefs.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedPrefs.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          audioUrl,
          text,
          languageCodesInput,
        }),
      );
    } catch {
      // Ignore local storage write failures.
    }
  }, [audioUrl, text, languageCodesInput]);

  const canGenerateRows = useMemo(
    () => parseLanguageCodes(languageCodesInput).length > 0,
    [languageCodesInput],
  );

  function handleGenerateRows() {
    const codes = parseLanguageCodes(languageCodesInput);
    setRows(codes.map((code) => ({ languageCode: code, loading: false, result: null })));
  }

  async function runAlignmentForRow(index: number) {
    if (!audioUrl.trim() || !text.trim()) {
      setRows((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          result: 'Please fill in both Audio URL and Transcript text first.',
        };
        return next;
      });
      return;
    }

    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], loading: true, result: null };
      return next;
    });

    const row = rows[index];
    const response = await alignWithRevAIAction({
      audioUrl: audioUrl.trim(),
      text: text.trim(),
      language: row.languageCode,
    });

    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        loading: false,
        result: response.success
          ? `Success. Received transcript JSON (${response.json.length} chars).`
          : `Error: ${response.error}`,
      };
      return next;
    });
  }

  const hasRows = rows.length > 0;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rev.ai Language Runner</h1>

        <section className="space-y-4 rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-black/20">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="audio-url">
              Audio URL
            </label>
            <input
              id="audio-url"
              type="url"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://example.com/audio.wav"
              className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="transcript-text">
              Transcript text
            </label>
            <textarea
              id="transcript-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste transcript text to align"
              className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition-all resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="language-codes">
              Language codes (one per line)
            </label>
            <textarea
              id="language-codes"
              value={languageCodesInput}
              onChange={(e) => setLanguageCodesInput(e.target.value)}
              rows={8}
              placeholder={'en\ncmn\nes\nfr'}
              className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition-all resize-y"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateRows}
            disabled={!canGenerateRows}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate table
          </button>
        </section>

        {hasRows && (
          <section className="rounded-xl border border-sky-200 dark:border-sky-500/30 overflow-x-auto">
            <table className="w-full text-sm min-w-160">
              <thead>
                <tr className="bg-sky-50 dark:bg-sky-500/10 text-left text-xs uppercase tracking-wider text-sky-800 dark:text-sky-300">
                  <th className="px-3 py-2 font-semibold w-24">Action</th>
                  <th className="px-3 py-2 font-semibold w-48">Language code</th>
                  <th className="px-3 py-2 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.languageCode}-${i}`} className="border-t border-gray-100 dark:border-white/5">
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => runAlignmentForRow(i)}
                        disabled={row.loading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {row.loading ? 'Running...' : 'Run'}
                      </button>
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-xs text-gray-700 dark:text-gray-200">
                      {row.languageCode}
                    </td>
                    <td className="px-3 py-2 align-top text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
                      {row.result ?? <span className="text-gray-400 italic">No result yet</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
