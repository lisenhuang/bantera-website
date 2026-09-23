import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { getPublicAudio, type BanteraPublicAudio } from "@/lib/bantera-api";
import { SITE_URL } from "@/lib/site-content";
import { ShadowingPlayer } from "./shadowing-player";

type PageProps = { params: Promise<{ audioId: string }> };

export const dynamic = "force-dynamic";

/** ISO 8601 duration, e.g. PT2M5S, for schema.org. */
function isoDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `PT${Math.floor(s / 60)}M${s % 60}S`;
}

// Describes the lesson for search and answer engines. The transcript is included because
// it is the lesson's actual content; it is capped to keep the page light.
function lessonLd(audio: BanteraPublicAudio) {
  const url = `${SITE_URL}/webapp/shadowing/${audio.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${url}#lesson`,
    name: audio.originalFileName,
    url,
    description: `Listening and shadowing practice in ${audio.transcriptLanguage}: ${audio.transcriptCues.length} cues you can play one at a time.`,
    inLanguage: audio.transcriptLanguageCode,
    learningResourceType: "Listening practice",
    educationalUse: "Shadowing",
    isAccessibleForFree: true,
    timeRequired: isoDuration(audio.durationMs),
    dateCreated: audio.createdAt,
    provider: { "@id": `${SITE_URL}/#organization` },
    associatedMedia: {
      "@type": "AudioObject",
      name: audio.originalFileName,
      encodingFormat: audio.videoContentType,
      duration: isoDuration(audio.durationMs),
      inLanguage: audio.transcriptLanguageCode,
      transcript: audio.transcriptText.slice(0, 5000),
    },
    ...(audio.isAiGenerated ? { creativeWorkStatus: "AI-generated" } : {}),
  };
}

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { audioId } = await params;
  const audio = await getPublicAudio(audioId);
  if (!audio) return { title: "Audio Not Found | Bantera" };
  const title = `Shadow: ${audio.originalFileName} | Bantera`;
  const description = `Practice shadowing "${audio.originalFileName}" cue by cue with word-level highlighting in your browser.`;
  return {
    title,
    description,
    alternates: { canonical: `/webapp/shadowing/${audioId}` },
    openGraph: {
      title,
      description,
      ...(audio.coverImageUrl ? { images: [audio.coverImageUrl] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(audio.coverImageUrl ? { images: [audio.coverImageUrl] } : {}),
    },
  };
}

export default async function ShadowingPage({ params }: PageProps) {
  const { audioId } = await params;
  const audio = await getPublicAudio(audioId);
  if (!audio) notFound();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#ffffff_35%,_#f8fafc_100%)] text-slate-950">
      <JsonLd data={lessonLd(audio)} />
      <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/webapp"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="flex-1 min-w-0 text-center text-base font-bold text-slate-800 truncate sm:text-lg">
            {audio.originalFileName}
          </h1>
          <div className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white tabular-nums">
            {formatDuration(audio.durationMs)}
          </div>
        </div>

        {/* Player */}
        <div className="mt-8">
          <ShadowingPlayer audio={audio} />
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Want translation, recording and progress sync?{" "}
          <Link href="/download" className="font-semibold text-amber-600 hover:underline">
            Get the Bantera app →
          </Link>
        </p>
      </div>
    </main>
  );
}
