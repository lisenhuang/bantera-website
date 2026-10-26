import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGE_GUIDES } from '../src/lib/language-guides.ts';
import { SUPPORTED_LANGUAGES, APP_STORE_URL, GOOGLE_PLAY_URL, FAQS } from '../src/lib/site-content.ts';
import { INTRODUCTIONS, introductionAlternates } from '../src/lib/localized-introductions.ts';
import { showPublicDownload } from '../src/lib/public-download.ts';

test('every advertised learning language has a unique useful guide', () => {
  assert.deepEqual(new Set(LANGUAGE_GUIDES.map(g => g.name)), new Set(SUPPORTED_LANGUAGES));
  assert.equal(new Set(LANGUAGE_GUIDES.map(g => g.slug)).size, LANGUAGE_GUIDES.length);
  for (const guide of LANGUAGE_GUIDES) {
    for (const key of ['focus', 'listening', 'speaking', 'example', 'meaning', 'exercise', 'question', 'answer']) {
      assert.ok(guide[key].trim().length > (key === 'example' ? 1 : 8), `${guide.slug}: ${key}`);
    }
  }
});

test('translated introductions have reciprocal self-referencing language links', () => {
  const alternates = introductionAlternates();
  assert.equal(INTRODUCTIONS.length, 17);
  assert.equal(new Set(INTRODUCTIONS.map(i => i.locale)).size, 17);
  for (const item of INTRODUCTIONS) {
    assert.equal(alternates[item.locale], `https://bantera.app/about/${item.locale}`);
    for (const text of [item.intro, item.practice, item.ai, item.support]) assert.ok(text.length > 40);
  }
  assert.equal(alternates['x-default'], alternates.en);
});

test('download entry points cover public deep links but exclude internal screens', () => {
  for (const path of ['/', '/faq', '/features', '/learn/japanese', '/about/zh-Hans', '/webapp', '/webapp/shadowing/lesson', '/support', '/privacy']) assert.ok(showPublicDownload(path), path);
  for (const path of [null, '/dashboard', '/dashboard/users', '/dev/gemini', '/api/data', '/auth/callback', '/download']) assert.equal(showPublicDownload(path), false, path);
  assert.equal(new URL(APP_STORE_URL).hostname, 'apps.apple.com');
  assert.equal(new URL(GOOGLE_PLAY_URL).searchParams.get('id'), 'com.lisenhuang.bantera');
});

test('FAQ questions remain unique for visible content and structured data', () => {
  assert.equal(new Set(FAQS.map(f => f.q)).size, FAQS.length);
});
