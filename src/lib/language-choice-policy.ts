export type LanguageChoiceContext = {
  countryCode?: string | null;
  systemLanguage?: string | null;
};

export function isTaiwanChinese(identifier: string) {
  const parts = identifier.trim().replaceAll("_", "-").toLowerCase().split("-");
  return parts[0] === "zh" && parts.slice(1).includes("tw");
}

export function usesSimplifiedChinese(language?: string | null) {
  if (!language?.trim()) return false;
  try {
    // Explicit script wins over region; bare zh and zh-SG also resolve to Hans.
    const locale = new Intl.Locale(language.trim().replaceAll("_", "-")).maximize();
    return locale.language === "zh" && locale.script === "Hans";
  } catch {
    return false;
  }
}

export function shouldHideTaiwan({ countryCode, systemLanguage }: LanguageChoiceContext) {
  const country = countryCode?.trim().toUpperCase();
  // Match the mobile app: require a known country outside mainland China.
  return !country || !/^[A-Z]{2}$/.test(country) || country === "XX" || country === "CN"
    || usesSimplifiedChinese(systemLanguage);
}

export function primaryRequestLanguage(acceptLanguage: string | null) {
  const preferences = (acceptLanguage ?? "").split(",").map((entry) => {
    const [language, ...parameters] = entry.trim().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    return { language, weight: quality ? Number(quality.trim().slice(2)) : 1 };
  });
  return preferences.filter(({ language, weight }) => language && language !== "*" && weight > 0 && weight <= 1)
    .sort((a, b) => b.weight - a.weight)[0]?.language ?? null;
}

export function languageChoiceContextFromHeaders(headers: Pick<Headers, "get">): LanguageChoiceContext {
  return {
    countryCode: headers.get("cf-ipcountry"),
    systemLanguage: headers.get("x-bantera-system-language")
      ?? primaryRequestLanguage(headers.get("accept-language")),
  };
}
