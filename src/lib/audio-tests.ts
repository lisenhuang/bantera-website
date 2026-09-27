export type AudioTest = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  stage: string;
  languageCode: string;
  language: string;
  targetDurationSeconds: number;
  textModel: string;
  audioModel: string;
  title: string | null;
  sourceTestId: string | null;
  audioDurationMs: number | null;
  audioBytes?: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  hasAudio: boolean;
  hasDialogue: boolean;
};
export type AudioTestDetail = AudioTest & {
  dialogue: { title: string; voice1: string; voice2: string; lines: { speaker: string; text: string }[] } | null;
  diagnostics: unknown[];
  error: { message?: string; [key: string]: unknown } | null;
};
export type AudioTestHistory = { total: number; items: AudioTest[] };
