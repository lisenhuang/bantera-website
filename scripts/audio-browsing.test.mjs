import test from "node:test";
import assert from "node:assert/strict";
import { mapCueWords, activeUnitAt } from "../src/lib/subtitle-words.ts";
import { groupAudioLanguages, audioLanguageGroupCode } from "../src/lib/audio-language-groups.ts";

test("a returned CJK word highlights together without using character parts", () => {
  const result = mapCueWords("文化保育。", [
    { word: "文化", startMs: 100, endMs: 500, parts: [
      { word: "文", startMs: 100, endMs: 300 }, { word: "化", startMs: 300, endMs: 500 },
    ] },
    { word: "保育", startMs: 550, endMs: 1000 },
  ], { startMs: 100, endMs: 1100 });
  assert.deepEqual(result.tokens.map((token) => token.unit), [0, 0, 1, 1]);
  assert.equal(activeUnitAt(result.units, 350), 0);
  assert.equal(activeUnitAt(result.units, 600), 1);
  assert.equal(activeUnitAt(result.units, 525), null);
});

test("separately returned CJK characters remain separate, with no invented words", () => {
  const result = mapCueWords("文化", [
    { word: "文", startMs: 100, endMs: 300 }, { word: "化", startMs: 300, endMs: 500 },
  ], { startMs: 100, endMs: 600 });
  assert.deepEqual(result.tokens.map((token) => token.unit), [0, 1]);
});

test("Japanese word boundaries and existing English timings are preserved", () => {
  const japanese = mapCueWords("図書館へ。", [
    { word: "図書館", startMs: 100, endMs: 600 }, { word: "へ", startMs: 650, endMs: 800 },
  ], { startMs: 100, endMs: 900 });
  assert.deepEqual(japanese.tokens.map((token) => token.unit), [0, 0, 0, 1]);
  const english = mapCueWords("Hello, friend!", [
    { word: "Hello", startMs: 100, endMs: 400 }, { word: "friend", startMs: 450, endMs: 800 },
  ], { startMs: 100, endMs: 900 });
  assert.deepEqual(english.tokens.map((token) => token.unit), [0, 1]);
});

test("language groups combine accents and preserve the Chinese exceptions", () => {
  const rows = [
    ["zh-HK", "Cantonese (Hong Kong)", "🇭🇰"], ["yue-CN", "Cantonese (China mainland)", "🇨🇳"],
    ["en-US", "English (US)", "🇺🇸"], ["en-NZ", "English (New Zealand)", "🇳🇿"],
    ["zh-CN", "Chinese (China mainland)", "🇨🇳"], ["zh-TW", "Chinese (Taiwan)", "🇹🇼"],
    ["ja-JP", "Japanese", "🇯🇵"],
  ].map(([identifier, displayName, flagEmoji]) => ({ identifier, displayName, flagEmoji }));
  const groups = groupAudioLanguages(rows);
  assert.equal(groups.length, 5);
  assert.deepEqual(groups.find((group) => group.identifier === "yue"),
    { identifier: "yue", displayName: "Cantonese", flagEmoji: "🇭🇰" });
  assert.equal(groups.find((group) => group.identifier === "en").flagEmoji, "🌐");
  assert.equal(groups.find((group) => group.identifier === "ja").flagEmoji, "🇯🇵");
  assert.equal(groups.find((group) => group.identifier === "zh-tw").flagEmoji, "🇹🇼");
  assert.equal(groups.find((group) => group.identifier === "zh-cn").flagEmoji, "🇨🇳");
  assert.equal(audioLanguageGroupCode(" EN_nz "), "en");
  assert.equal(audioLanguageGroupCode("zh-Hant-HK"), "yue");
  assert.equal(audioLanguageGroupCode("zh-Hant-TW"), "zh-tw");
  assert.deepEqual(groupAudioLanguages([]), []);
});
