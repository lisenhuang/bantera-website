import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicAudio } from "@/lib/bantera-api";

import { CuePracticePlayer } from "./cue-practice-player";

type PageProps = {
  params: Promise<{ videoId: string }>;
};

export const dynamic = "force-dynamic";

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatCreatedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { videoId } = await params;
  const audio = await getPublicAudio(videoId);

  if (!audio) {
    return {
      title: "Audio Not Found | Bantera",
    };
  }

  const title = `${audio.originalFileName} | Bantera Web App`;
  const description = "Practise this Bantera public audio cue by cue in the browser.";
  return {
    title,
    description,
    // Same audio as the shadowing view, which is the page the web app links to —
    // point search engines there so the two do not compete as duplicates.
    alternates: { canonical: `/webapp/shadowing/${videoId}` },
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

export default async function WebappAudioDetailPage({ params }: PageProps) {
  const { videoId } = await params;
  const audio = await getPublicAudio(videoId);

  if (!audio) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#ffffff_35%,_#f8fafc_100%)] text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <Link
          href="/webapp"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
        >
          <span aria-hidden="true">←</span>
          Back to public audio
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <div className="rounded-[2.4rem] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                    Public audio practice
                  </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    {audio.originalFileName}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    Play this audio one cue at a time. The transcript starts
                    hidden, so you can test your listening first and only reveal
                    the text when you want to check yourself.
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-slate-950 px-5 py-4 text-white shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Duration
                  </div>
                  <div className="mt-2 text-3xl font-black">
                    {formatDuration(audio.durationMs)}
                  </div>
                </div>
              </div>
            </div>

            <CuePracticePlayer audio={audio} />
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">About this audio</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Creator
                  </dt>
                  <dd className="mt-1 text-slate-700">
                    {audio.creatorDisplayName?.trim() || "Bantera"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Transcript language
                  </dt>
                  <dd className="mt-1 text-slate-700">{audio.transcriptLanguage}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Cues
                  </dt>
                  <dd className="mt-1 text-slate-700">
                    {audio.transcriptCues.length}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Published
                  </dt>
                  <dd className="mt-1 text-slate-700">
                    {formatCreatedDate(audio.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Type
                  </dt>
                  <dd className="mt-1 text-slate-700">
                    {audio.isAiGenerated ? "AI-generated audio" : "Uploaded audio"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Listening mode
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Transcript is hidden by default here. Reveal it only when you
                want to check the cue after listening.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
