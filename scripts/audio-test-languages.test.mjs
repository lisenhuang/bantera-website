import test from 'node:test';
import assert from 'node:assert/strict';
import { audioTestLanguages } from '../src/lib/audio-tests.ts';

test('Māori is added only to private audio tests without mutating public language choices', () => {
  const publicLanguages = Object.freeze([
    { identifier: 'en-NZ', displayName: 'English (New Zealand)', flagEmoji: '🇳🇿' },
    { identifier: 'zh-HK', displayName: 'Cantonese (Hong Kong)', flagEmoji: '🇭🇰' },
  ]);
  const languages = audioTestLanguages(publicLanguages);
  assert.deepEqual(languages.slice(0, 2), publicLanguages);
  assert.deepEqual(languages[2], { identifier: 'mi-NZ', displayName: 'Māori (New Zealand)', flagEmoji: '🇳🇿' });
  assert.equal(publicLanguages.some(language => language.identifier === 'mi-NZ'), false);
  assert.deepEqual(audioTestLanguages(languages), languages);
});
