'use client';

import { useActionState, useState } from 'react';
import { testWebSearchAction, type SearchTestState } from './actions';

export function SearchTestPanel({ model }: { model: string }) {
  const [query, setQuery] = useState('What are the latest technology headlines in New Zealand today?');
  const [state, action, pending] = useActionState<SearchTestState, FormData>(testWebSearchAction, {});
  const result = state.result;
  return (
    <form action={action} className="space-y-4" aria-busy={pending}>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Test the search used for lesson generation. Primary model: <code>{model}</code>. The saved fallback is used if needed.
        Tests use the selected provider’s API quota or ChatGPT subscription allowance.
      </p>
      <label className="block text-sm font-medium text-gray-900 dark:text-white" htmlFor="search-test-query">Search query</label>
      <textarea id="search-test-query" name="query" required minLength={3} maxLength={1000} rows={3}
        value={query} onChange={event => setQuery(event.target.value)} readOnly={pending}
        className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || query.trim().length < 3}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {pending ? 'Searching…' : 'Test web search'}
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">Does not change saved settings.</span>
      </div>
      <div role="status" aria-live="polite">
        {pending && <p className="text-sm text-indigo-600 dark:text-indigo-300">Waiting for an answer and verifying search sources…</p>}
        {!pending && state.error && <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
        {!pending && result && (
          <div className="space-y-4 rounded-xl border border-gray-200 dark:border-white/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`font-semibold ${result.success ? 'text-green-700 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
                {result.success ? '✓ Search succeeded' : result.code === 'search_not_verified' ? 'Search not verified' : 'Search failed'}
              </p>
              <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{(result.durationMs / 1000).toFixed(1)}s · {result.provider} · {result.model}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{result.message}</p>
            {result.usedFallback && <p className="text-sm text-amber-700 dark:text-amber-300">The primary search failed. The configured fallback completed this search.</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">Query: {state.query}</p>
            {result.answer && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-900 dark:text-white">{result.answer}</p>}
            {!!result.sources?.length && <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Sources</h4>
              <ul className="mt-2 space-y-2">{result.sources.map((source, index) => <li key={source.url} className="text-sm">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="break-words text-indigo-700 underline underline-offset-2 dark:text-indigo-300">{index + 1}. {source.title}</a>
              </li>)}</ul>
            </div>}
            {!!result.queries?.length && <details className="text-xs text-gray-600 dark:text-gray-300">
              <summary className="cursor-pointer">Searches performed</summary>
              <ul className="mt-2 list-inside list-disc">{result.queries.map((value, index) => <li key={index}>{value}</li>)}</ul>
            </details>}
            {result.suggestionsHtml && <iframe title="Google Search suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer" className="h-32 w-full rounded-lg border-0 bg-white"
              srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:;">${result.suggestionsHtml}`} />}
            <p className="break-all text-xs text-gray-500 dark:text-gray-400">Diagnostic reference: {result.testId} · {result.code}</p>
          </div>
        )}
      </div>
    </form>
  );
}
