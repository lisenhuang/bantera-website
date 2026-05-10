import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicAudio } from "@/lib/bantera-api";
import { ShadowingPlayer } from "./shadowing-player";

type PageProps = { params: Promise<{ audioId: string }> };

export const dynamic = "force-dynamic";

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { audioId } = await params;
  const audio = await getPublicAudio(audioId);
  if (!audio) return { title: "Audio Not Found | Bantera" };
  return {
    title: `Shadow: ${audio.originalFileName} | Bantera`,
    description: `Practice shadowing "${audio.originalFileName}" cue by cue with word-level highlighting in your browser.`,
  };
}

export default async function ShadowingPage({ params }: PageProps) {
  const { audioId } = await params;
  const audio = await getPublicAudio(audioId);
  if (!audio) notFound();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#ffffff_35%,_#f8fafc_100%)] text-slate-950">
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
