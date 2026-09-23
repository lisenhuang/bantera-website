'use client';

import { useState } from 'react';
import type { AnalyticsLanguage, AnalyticsLanguageBreakdown } from '@/lib/dashboard-api';
import { BarList, type BarRow } from './charts';

type View = 'combined' | 'accent';

const VIEWS: { value: View; label: string }[] = [
  { value: 'combined', label: 'Combine accents' },
  { value: 'accent', label: 'By accent' },
];

function toRows(languages: AnalyticsLanguage[], view: View): BarRow[] {
  return languages.map((l) => ({
    key: l.key,
    flag: l.flag,
    label: l.displayName,
    value: l.users,
    pct: l.pct,
    // In the combined view, show which accents make up the total. Each accent is one
    // non-breaking unit so a flag never wraps away from its name.
    detail: view === 'combined' && l.variants.length > 1
      ? (
        <span className="flex flex-wrap gap-x-2 gap-y-0.5">
          {l.variants.map((v) => (
            <span key={v.code} className="whitespace-nowrap">
              <span aria-hidden>{v.flag}</span> {v.displayName.replace(/^.*\((.*)\)$/, '$1')} {v.users}
            </span>
          ))}
        </span>
      )
      : undefined,
  }));
}

function Panel({ title, breakdown, view, noun }: {
  title: string;
  breakdown: AnalyticsLanguageBreakdown;
  view: View;
  noun: string;
}) {
  const languages = view === 'combined' ? breakdown.combined : breakdown.byAccent;
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {languages.length} {languages.length === 1 ? 'language' : 'languages'}
        </span>
      </div>
      <BarList rows={toRows(languages, view)} initial={8} empty={`No users have set a ${noun} yet.`} />
      {breakdown.unset > 0 && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {breakdown.unset.toLocaleString('en')} {breakdown.unset === 1 ? 'user has' : 'users have'} not set a {noun}. Percentages are of users who have.
        </p>
      )}
    </div>
  );
}

/** Native and learning languages, with one toggle scoping both. */
export function LanguagePanels({ native, learning }: {
  native: AnalyticsLanguageBreakdown;
  learning: AnalyticsLanguageBreakdown;
}) {
  const [view, setView] = useState<View>('combined');

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Languages</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">All current users, most common first.</p>
        </div>
        <div role="radiogroup" aria-label="Accent grouping"
          className="inline-flex rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-0.5 text-xs font-medium">
          {VIEWS.map((v) => (
            <button key={v.value} type="button" role="radio" aria-checked={view === v.value}
              onClick={() => setView(v.value)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                view === v.value
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Native languages" breakdown={native} view={view} noun="native language" />
        <Panel title="Learning languages" breakdown={learning} view={view} noun="learning language" />
      </div>
    </section>
  );
}
