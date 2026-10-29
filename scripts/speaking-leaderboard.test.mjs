import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import * as periods from '../src/lib/speaking-leaderboard-settings.ts';

const require = createRequire(import.meta.url);
const components = 'src/app/dashboard/(protected)/_components/';

// Exercise the actual server actions and components with isolated framework/API
// dependencies, without a running Next server or production network requests.
function loadSource(path, dependencies, fetch = () => { throw new Error('Unexpected fetch'); }) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('require', 'exports', 'fetch', outputText)((name) => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports, fetch);
  return exports;
}

function loadApi(fetch) {
  return loadSource('src/lib/dashboard-api.ts', {
    'next/headers': { cookies: async () => ({ get: () => undefined }) },
    './bantera-api': { getApiBaseUrl: () => 'https://api.example.test' },
    './speaking-leaderboard-settings': periods,
  }, fetch);
}

function loadAction({ token = 'admin-token', update, revalidate = () => {} } = {}) {
  return loadSource(`${components}speaking-leaderboard-actions.ts`, {
    'next/cache': { revalidatePath: revalidate },
    'next/navigation': { redirect: (path) => { throw new Error(`Redirect: ${path}`); } },
    '@/lib/dashboard-api': { getAccessToken: async () => token, updateSpeakingLeaderboardSettings: update },
    '@/lib/speaking-leaderboard-settings': periods,
  }).saveSpeakingLeaderboardSettingsAction;
}

const formData = (days) => {
  const form = new FormData();
  if (days !== undefined) form.set('days', days);
  return form;
};

test('leaderboard periods accept whole days from 1 through 365 and label one day correctly', () => {
  for (const days of [1, 30, 90, 365]) assert.equal(periods.isLeaderboardDays(days), true);
  for (const days of [0, -1, 366, 1.5, NaN, Infinity, '30', null, undefined]) assert.equal(periods.isLeaderboardDays(days), false);
  assert.equal(periods.leaderboardPeriodLabel(1), 'Last 1 day');
  assert.equal(periods.leaderboardPeriodLabel(90), 'Last 90 days');
});

test('preview uses the configured route, authenticates and preserves the reported period', async () => {
  const api = loadApi(async (url, options) => {
    assert.equal(url, 'https://api.example.test/api/speaking-leaderboard/configured');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    return Response.json({ periodDays: 90, fromDate: '2026-08-01', throughDate: '2026-10-29' });
  });
  assert.equal((await api.getSpeakingLeaderboard('admin-token')).periodDays, 90);
  const invalid = loadApi(async () => Response.json({ rows: [] }));
  await assert.rejects(invalid.getSpeakingLeaderboard('admin-token'), /Invalid leaderboard period/);
});

test('settings reads retain the saved period and reject unknown values instead of assuming 30', async () => {
  const api = loadApi(async (url) => {
    assert.equal(url, 'https://api.example.test/api/admin/speaking-leaderboard-settings');
    return Response.json({ days: 7 });
  });
  assert.deepEqual(await api.getSpeakingLeaderboardSettings('admin-token'), { days: 7 });
  for (const settings of [{}, { days: 0 }, { days: '30' }, { days: 366 }]) {
    await assert.rejects(loadApi(async () => Response.json(settings)).getSpeakingLeaderboardSettings('admin-token'), /Invalid leaderboard settings/);
  }
});

test('settings saves require matching server confirmation and surface server failures', async () => {
  const api = loadApi(async (url, options) => {
    assert.equal(url, 'https://api.example.test/api/admin/speaking-leaderboard-settings');
    assert.equal(options.method, 'PUT');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    assert.deepEqual(JSON.parse(options.body), { days: 60 });
    return Response.json({ days: 60 });
  });
  assert.deepEqual(await api.updateSpeakingLeaderboardSettings('admin-token', { days: 60 }), { ok: true, settings: { days: 60 } });
  for (const result of [{ days: 30 }, {}, null]) {
    const failed = await loadApi(async () => Response.json(result)).updateSpeakingLeaderboardSettings('admin-token', { days: 60 });
    assert.equal(failed.ok, false);
    assert.match(failed.message, /Could not confirm/);
  }
  const failed = await loadApi(async () => Response.json({ message: 'Admin access required.' }, { status: 403 }))
    .updateSpeakingLeaderboardSettings('admin-token', { days: 60 });
  assert.deepEqual(failed, { ok: false, status: 403, message: 'Admin access required.' });
});

test('server action rejects invalid or unauthenticated requests without changing settings', async () => {
  let saves = 0;
  const action = loadAction({ update: async () => { saves++; } });
  for (const value of [undefined, '', ' ', '0', '-1', '366', '30.5', 'NaN', 'Infinity', new File(['30'], 'days.txt')]) {
    assert.deepEqual(await action({}, formData(value)), { error: 'Choose a whole number from 1 to 365.' });
  }
  await assert.rejects(loadAction({ token: null, update: async () => { saves++; } })({}, formData('30')), /Redirect: \/dashboard\/login/);
  assert.equal(saves, 0);
});

test('server action revalidates the preview only after confirmed saves, with failures kept visible', async () => {
  const revalidated = [];
  const action = loadAction({
    update: async (token, settings) => {
      assert.equal(token, 'admin-token');
      assert.deepEqual(settings, { days: 365 });
      return { ok: true, settings };
    },
    revalidate: (path) => revalidated.push(path),
  });
  assert.deepEqual(await action({}, formData('365')), { saved: { days: 365 } });
  assert.deepEqual(revalidated, ['/dashboard']);

  const rejected = loadAction({ update: async () => ({ ok: false, status: 403, message: 'Admin access required.' }), revalidate: () => assert.fail('Failed save revalidated') });
  assert.deepEqual(await rejected({ saved: { days: 30 } }, formData('60')), { error: 'Admin access required.' });
  const uncertain = loadAction({ update: async () => { throw new Error('Network failure'); } });
  assert.match((await uncertain({}, formData('60'))).error, /Could not confirm/);
  const expired = loadAction({ update: async () => ({ ok: false, status: 401, message: 'Expired' }) });
  await assert.rejects(expired({}, formData('60')), /Redirect: \/dashboard\/login/);
});

function loadLeaderboard(settings, report) {
  const form = loadSource(`${components}speaking-leaderboard-settings-form.tsx`, {
    './speaking-leaderboard-actions': { saveSpeakingLeaderboardSettingsAction: async () => ({}) },
    '@/lib/speaking-leaderboard-settings': periods,
  });
  return loadSource(`${components}speaking-leaderboard.tsx`, {
    './user-avatar': { UserAvatar: () => null },
    '@/lib/dashboard-api': {
      getSpeakingLeaderboardSettings: async () => { if (settings instanceof Error) throw settings; return settings; },
      getSpeakingLeaderboard: async () => { if (report instanceof Error) throw report; return report; },
    },
    '@/lib/speaking-leaderboard-settings': periods,
    './speaking-leaderboard-settings-form': form,
  }).SpeakingLeaderboard;
}

test('rankings failure keeps the saved configuration available', async () => {
  const component = loadLeaderboard({ days: 7 }, new Error('Rankings offline'));
  const html = renderToStaticMarkup(await component({ token: 'admin-token' }));
  assert.match(html, /App leaderboard period/);
  assert.match(html, /value="7"/);
  assert.match(html, /Saved period: last 7 days/);
  assert.match(html, /Rankings are temporarily unavailable/);
  assert.doesNotMatch(html, /disabled=""/);
});

test('preview shows its actual range and does not infer a saved setting when configuration fails', async () => {
  const component = loadLeaderboard(new Error('Settings offline'), {
    periodDays: 1, fromDate: '2026-10-29', throughDate: '2026-10-29', timeZone: 'UTC',
    limit: 20, rows: [], includesLegacyDates: false,
  });
  const html = renderToStaticMarkup(await component({ token: 'admin-token' }));
  assert.match(html, /Last 1 day/);
  assert.match(html, /2026-10-29 to 2026-10-29 · UTC/);
  assert.match(html, /The saved period could not be loaded/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /Saved period: last 30 days/);
});
