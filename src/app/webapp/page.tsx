import type { Metadata } from "next";
import { headers } from "next/headers";
import AudioBrowser from "./audio-browser";
import { languageChoiceContextFromHeaders } from "@/lib/language-choice-policy";
import { audioLanguageGroupCode, groupAudioLanguages } from "@/lib/audio-language-groups";

import {
  getLearningLanguages,
  listPublicAudios,
} from "@/lib/bantera-api";

export const metadata: Metadata = {
  title: "Language Listening & Speaking Audio Practice | Bantera",
  description:
    "Choose a language, browse Bantera public audio, and practise listening cue by cue in the browser.",
  alternates: { canonical: "/webapp" },
};

export const dynamic = "force-dynamic";

type WebappPageProps = {
  searchParams: Promise<{
    languageCode?: string;
  }>;
};

export default async function WebappPage({ searchParams }: WebappPageProps) {
  const { languageCode } = await searchParams;
  const context = languageChoiceContextFromHeaders(await headers());
  const languages = groupAudioLanguages(await getLearningLanguages(context));
  // Old links with an accent code select the corresponding browsing group.
  const selectedCode = languageCode ? audioLanguageGroupCode(languageCode) : null;
  const selectedLanguage = languages.find((language) => language.identifier === selectedCode) ?? null;
  const audios = selectedLanguage
    ? await listPublicAudios({ languageGroup: selectedLanguage.identifier }).catch(() => [])
    : [];

  return <AudioBrowser languages={languages} selectedCode={selectedCode} audios={audios} />;
}
