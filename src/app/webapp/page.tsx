import type { Metadata } from "next";
import Link from "next/link";

import {
  getLearningLanguages,
  listPublicAudios,
} from "@/lib/bantera-api";

export const metadata: Metadata = {
  title: "Public Audio | Bantera",
  description:
    "Choose a language, browse Bantera public audio, and practise listening cue by cue in the browser.",
};

export const dynamic = "force-dynamic";

type WebappPageProps = {
  searchParams: Promise<{
    languageCode?: string;
  }>;
};

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function WebappPage({ searchParams }: WebappPageProps) {
  const { languageCode } = await searchParams;
  const [languages, audios] = await Promise.all([
    getLearningLanguages(),
    languageCode ? listPublicAudios({ languageCode }) : Promise.resolve([]),
  ]);
  const selectedLanguage = languages.find((l) => l.identifier === languageCode) ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#fff_38%,_#f8fafc_100%)] text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Web App
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Choose a language, then browse public audio
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Bantera will only load the public audio list after you pick a
              language. When you open an item, you can practise one cue at a
              time with the transcript hidden by default.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Selected language
            </div>
            <div className="mt-2 text-lg font-black text-slate-950">
              {selectedLanguage
                ? `${selectedLanguage.flagEmoji} ${selectedLanguage.displayName}`
                : "None"}
            </div>
            <div className="text-sm text-slate-500">
              {selectedLanguage
                ? `${audios.length} public audio items`
                : "Choose one to continue"}
            </div>
          </div>
        </div>

        <section className="rounded-[2.2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Language
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Pick a language to load public audio
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              This dropdown matches the backend&apos;s current hard-coded
              languages. Bantera won&apos;t load the public audio list until you
              choose one.
            </p>
          </div>

          <form className="mt-8">
            <label
              htmlFor="languageCode"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Practice language
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                id="languageCode"
                name="languageCode"
                defaultValue={selectedLanguage?.identifier ?? ""}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-amber-400 focus:bg-white"
              >
                <option value="">Select a language</option>
                {languages.map((lang) => (
                  <option key={lang.identifier} value={lang.identifier}>
                    {lang.flagEmoji} {lang.displayName}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Load audio
              </button>
            </div>
          </form>

          {selectedLanguage ? (
            <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
              <span aria-hidden="true">{selectedLanguage.flagEmoji}</span>
              <span>
                Showing public audio for {selectedLanguage.displayName}
              </span>
            </div>
          ) : (
            <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              Select a language, then press <span className="font-semibold text-slate-950">Load audio</span>.
            </div>
          )}
        </section>

        {!selectedLanguage ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 px-8 py-14 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">
              Pick a language to load public audio
            </h2>
            <p className="mt-3 text-slate-600">
              Bantera will show the public audio list after you choose one of
              the supported languages above.
            </p>
          </section>
        ) : audios.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 px-8 py-14 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">
              No public audio yet for {selectedLanguage.displayName}
            </h2>
            <p className="mt-3 text-slate-600">
              Try another language or come back later when more public audio is
              available.
            </p>
          </section>
        ) : (
          <section className="mt-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Step 2
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Public audio in {selectedLanguage.displayName}
                </h2>
              </div>
              <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                {audios.length} items
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {audios.map((audio) => {
                const firstCue = audio.transcriptCues.find((cue) =>
                  cue.text.trim(),
                );
                return (
                  <Link
                    key={audio.id}
                    href={`/webapp/shadowing/${audio.id}`}
                    className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                          {audio.transcriptLanguageCode.toUpperCase()}
                        </div>
                        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                          {audio.originalFileName}
                        </h2>
                      </div>
                      <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                        {formatDuration(audio.durationMs)}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                        {audio.transcriptCues.length} cues
                      </span>

                      {audio.isAiGenerated ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
                          AI audio
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">
                      {firstCue?.text?.trim() ||
                        audio.transcriptText.trim() ||
                        "Open this audio to practise the transcript cue by cue."}
                    </p>

                    <div className="mt-6 flex items-center justify-between text-sm">
                      <span className="text-slate-400">
                        {formatRelativeDate(audio.createdAt)}
                      </span>
                      <span className="font-semibold text-amber-700 transition group-hover:translate-x-1">
                        Open practice
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
