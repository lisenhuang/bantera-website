import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccessToken, getAdminAnalytics, type AdminAnalytics } from '@/lib/dashboard-api';
import { LanguagePanels } from './_components/audience-panels';
import { BarList, ColumnChart, LineChart, PartToWholeBar } from './_components/charts';

export const dynamic = 'force-dynamic';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const;

const SERIES = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)'];

// Colour follows the provider, never its rank, so a change in order cannot repaint it.
const PROVIDERS: Record<string, { label: string; color: string }> = {
  apple: { label: 'Apple', color: SERIES[0] },
  google: { label: 'Google', color: SERIES[1] },
  email: { label: 'Email', color: SERIES[2] },
};

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code: string) => {
  try { return regionNames.of(code) ?? code; } catch { return code; }
};

function compact(n: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

// ── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, delta }: {
  label: string;
  value: string;
  sub?: string;
  delta?: { current: number; previous: number; periodLabel: string };
}) {
  let deltaNode = null;
  if (delta) {
    const diff = delta.current - delta.previous;
    const up = diff > 0;
    const flat = diff === 0;
    const pct = delta.previous > 0 ? Math.round((diff / delta.previous) * 100) : null;
    const text = flat
      ? `Same as previous ${delta.periodLabel}`
      : `${up ? '+' : '−'}${pct !== null ? `${Math.abs(pct)}%` : Math.abs(diff)} vs previous ${delta.periodLabel}`;
    // Status colour always paired with an arrow and words, never colour alone.
    deltaNode = (
      <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: flat ? 'var(--viz-muted)' : up ? 'var(--viz-good)' : 'var(--viz-bad)' }}>
        {!flat && <span aria-hidden>{up ? '▲' : '▼'}</span>}
        <span>{text}</span>
      </p>
    );
  }

  return (
    <div className="viz-root rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-5">
      <p className="label-xs">{label}</p>
      <p className="text-3xl font-semibold mt-1 text-gray-900 dark:text-white">{value}</p>
      {deltaNode}
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  const { range } = await searchParams;
  const days = RANGES.find((r) => String(r.days) === range)?.days ?? 30;
  const rangeLabel = RANGES.find((r) => r.days === days)!.label;

  let data: AdminAnalytics;
  try {
    data = await getAdminAnalytics(token, days);
  } catch {
    redirect('/dashboard/login');
  }

  const { kpis } = data;
  const periodLabel = days === 365 ? '12 months' : `${days} days`;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Updated {new Date(data.asOf).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      {/* KPI row — "now", independent of the range filter */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatTile label="Total users" value={kpis.totalUsers.toLocaleString('en')} sub="Current accounts" />
        <StatTile label="New users" value={kpis.newUsers.toLocaleString('en')} sub={`Last ${rangeLabel}`}
          delta={{ current: kpis.newUsers, previous: kpis.newUsersPreviousPeriod, periodLabel }} />
        <StatTile label="Daily active" value={compact(kpis.dau)} sub="Today, UTC" />
        <StatTile label="Weekly active" value={compact(kpis.wau)} sub="Last 7 days" />
        <StatTile label="Monthly active" value={compact(kpis.mau)} sub="Last 30 days" />
        <StatTile label="Content" value={compact(kpis.totalContent)}
          sub={`${kpis.uploads.toLocaleString('en')} uploads · ${kpis.aiAudio.toLocaleString('en')} AI audio`} />
      </div>

      {/* Trends — the range filter sits above exactly what it scopes */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trends</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.bucket === 'week' ? 'Weekly' : 'Daily'} buckets, UTC.
            </p>
          </div>
          <nav aria-label="Date range" className="inline-flex rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-0.5 text-xs font-medium">
            {RANGES.map((r) => (
              <Link key={r.days} href={`/dashboard?range=${r.days}`} scroll={false}
                aria-current={r.days === days ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  r.days === days
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}>
                {r.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card title="New sign-ups" subtitle="Accounts created. Deleted accounts are not counted.">
            <ColumnChart
              label={`New sign-ups over the last ${rangeLabel}`}
              bucket={data.bucket}
              series={[{ key: 'signups', label: 'Sign-ups', color: SERIES[0] }]}
              data={data.signups.map((p) => ({ date: p.date, values: [p.count] }))}
            />
          </Card>

          <Card title="Active users"
            subtitle={data.liveTrackingSince
              ? `Unique users per day, and over rolling 7 and 30 days. Measured since ${new Date(`${data.liveTrackingSince}T00:00:00Z`).toLocaleDateString('en', { dateStyle: 'medium', timeZone: 'UTC' })}.`
              : 'Unique users per day, and over rolling 7 and 30 days. Live tracking has not recorded a day yet.'}>
            <LineChart
              label={`Daily, weekly and monthly active users over the last ${rangeLabel}`}
              estimatedBefore={data.liveTrackingSince}
              series={[
                { key: 'dau', label: 'DAU', color: SERIES[0] },
                { key: 'wau', label: 'WAU', color: SERIES[1] },
                { key: 'mau', label: 'MAU', color: SERIES[2] },
              ]}
              data={data.activeUsers.map((p) => ({ date: p.date, values: [p.dau, p.wau, p.mau] }))}
            />
          </Card>
        </div>

        <Card title="Content created"
          subtitle={`User uploads and AI-generated audio. AI generation succeeded ${kpis.aiJobSuccessRatePct}% of the time over this range (${kpis.aiJobs.toLocaleString('en')} attempts).`}>
          <ColumnChart
            label={`Content created over the last ${rangeLabel}`}
            bucket={data.bucket}
            height={180}
            series={[
              { key: 'uploads', label: 'Uploads', color: SERIES[0] },
              { key: 'ai', label: 'AI audio', color: SERIES[1] },
            ]}
            data={data.content.map((p) => ({ date: p.date, values: [p.uploads, p.aiAudio] }))}
          />
        </Card>
      </section>

      {/* Audience — all current users, not scoped by the range */}
      <LanguagePanels native={data.nativeLanguages} learning={data.learningLanguages} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Where users are</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Each user counted once, at their most recent location from Cloudflare.
            {data.usersWithoutLocation > 0 && ` ${data.usersWithoutLocation.toLocaleString('en')} users have no location yet — it is recorded the next time they open the app.`}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Countries">
            <BarList
              empty="No location data yet. It starts collecting from this release."
              rows={(() => {
                const total = data.countries.reduce((a, c) => a + c.users, 0);
                return data.countries.map((c) => ({
                  key: c.code,
                  flag: c.flag,
                  label: countryName(c.code),
                  value: c.users,
                  pct: total ? Math.round((c.users / total) * 1000) / 10 : 0,
                }));
              })()}
            />
          </Card>
          <Card title="Top cities">
            <BarList
              empty={'No city data yet. City and region need Cloudflare’s “Add visitor location headers” managed transform.'}
              rows={data.cities.map((c) => ({
                key: `${c.city}-${c.countryCode}`,
                flag: c.flag,
                label: c.city,
                detail: [c.region !== c.city ? c.region : null, countryName(c.countryCode)].filter(Boolean).join(', '),
                value: c.users,
              }))}
            />
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top language pairs" subtitle="What people speak, and what they are learning.">
          {data.languagePairs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No users have set both languages yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400">
                  <th className="text-left font-medium pb-2">Speaks</th>
                  <th className="text-left font-medium pb-2">Learning</th>
                  <th className="text-right font-medium pb-2">Users</th>
                </tr>
              </thead>
              <tbody className="text-gray-900 dark:text-white">
                {data.languagePairs.map((p) => (
                  <tr key={`${p.native}-${p.learning}`} className="border-t border-gray-100 dark:border-white/5">
                    <td className="py-2"><span aria-hidden className="mr-1.5">{p.nativeFlag}</span>{p.nativeName}</td>
                    <td className="py-2"><span aria-hidden className="mr-1.5">{p.learningFlag}</span>{p.learningName}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{p.users.toLocaleString('en')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Sign-in methods" subtitle="Users can link more than one, so these can add up to more than the user count.">
          <PartToWholeBar
            parts={data.providers.map((p) => ({
              key: p.provider,
              label: PROVIDERS[p.provider]?.label ?? p.provider,
              value: p.users,
              color: PROVIDERS[p.provider]?.color ?? 'var(--viz-muted)',
            }))}
          />
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {kpis.usersWithPushToken.toLocaleString('en')} users can receive push notifications.
          </p>
        </Card>
      </section>
    </div>
  );
}
