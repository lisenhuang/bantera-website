import { getAdminStats, getAccessToken } from '@/lib/dashboard-api';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type StatCardProps = {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
};

function StatCard({ label, value, sub, accent = 'indigo' }: StatCardProps) {
  const accentMap: Record<string, string> = {
    indigo: 'text-indigo-600 dark:text-indigo-400',
    violet: 'text-violet-600 dark:text-violet-400',
    orange: 'text-orange-500 dark:text-orange-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-6">
      <p className="label-xs">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${accentMap[accent] ?? accentMap.indigo}`}>
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  let stats;
  try {
    stats = await getAdminStats(token);
  } catch {
    redirect('/dashboard/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform stats at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          sub="All registered accounts"
          accent="indigo"
        />
        <StatCard
          label="Total Audio / Videos"
          value={stats.totalVideos}
          sub="All uploaded content"
          accent="violet"
        />
        <StatCard
          label="Active (7 days)"
          value={stats.activeLast7Days}
          sub="Logged in last 7 days"
          accent="emerald"
        />
        <StatCard
          label="Active (30 days)"
          value={stats.activeLast30Days}
          sub="Logged in last 30 days"
          accent="orange"
        />
      </div>

      {/* Content breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="AI-Generated Audio"
          value={stats.aiGeneratedVideos}
          sub="Created via Gemini studio"
          accent="violet"
        />
        <StatCard
          label="User Uploads"
          value={stats.uploadedVideos}
          sub="Uploaded by users"
          accent="indigo"
        />
      </div>

      {/* Placeholder chart */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-6">
        <p className="label-xs mb-4">Recent Signups</p>
        <div className="h-40 flex items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-white/10">
          <p className="text-sm text-gray-400 dark:text-gray-600">Signups chart — coming soon</p>
        </div>
      </div>
    </div>
  );
}
