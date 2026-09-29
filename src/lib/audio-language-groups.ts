import type { BanteraLearningLanguage } from "./bantera-api";

export function audioLanguageGroupCode(identifier: string) {
  const code = identifier.trim().replaceAll("_", "-").toLowerCase();
  if (code === "zh-hk" || code === "zh-hant-hk" || code === "yue" || code.startsWith("yue-")) return "yue";
  if (code === "zh-tw" || code === "zh-hant-tw") return "zh-tw";
  if (code === "zh" || code.startsWith("zh-")) return "zh-cn";
  return code.split("-")[0];
}

export function groupAudioLanguages(languages: BanteraLearningLanguage[]): BanteraLearningLanguage[] {
  const groups = new Map<string, BanteraLearningLanguage[]>();
  for (const language of languages) {
    const code = audioLanguageGroupCode(language.identifier);
    const members = groups.get(code) ?? [];
    members.push(language);
    groups.set(code, members);
  }
  return [...groups].map(([identifier, members]) => {
    const exceptions: Record<string, { displayName: string; flagEmoji: string }> = {
      yue: { displayName: "Cantonese", flagEmoji: "🇭🇰" },
      "zh-cn": { displayName: "Chinese (Mainland China)", flagEmoji: "🇨🇳" },
      "zh-tw": { displayName: "Chinese (Taiwan)", flagEmoji: "🇹🇼" },
    };
    return {
      identifier,
      ...(exceptions[identifier] ?? {
        displayName: members[0].displayName.split(" (")[0],
        flagEmoji: new Set(members.map((member) => member.flagEmoji)).size > 1 ? "🌐" : members[0].flagEmoji,
      }),
    };
  });
}
