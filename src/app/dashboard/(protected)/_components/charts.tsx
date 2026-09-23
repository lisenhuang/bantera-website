'use client';

// Dashboard charts, hand-built in SVG/HTML to the dataviz mark specs: bars ≤24px with a
// 4px rounded data-end and square baseline, 2px lines, 2px surface gaps between touching
// marks, hairline solid grid, text in ink tokens (never the series colour), a legend for
// two or more series, a hover/focus readout, and a table view for every chart.

import { useId, useRef, useState, useEffect, type KeyboardEvent, type ReactNode } from 'react';

export type ChartSeries = { key: string; label: string; color: string };
export type ChartPoint = { date: string; values: number[] };
export type Bucket = 'day' | 'week';

// ── Shared helpers ───────────────────────────────────────────────────────────

/** Tracks an element's width. ResizeObserver reports once on observe, so no initial read is needed. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Clean integer axis: 0 up to a round maximum in ~4 steps. */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const step = Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitude);
  return { max: Math.ceil(max / step) * step, step };
}

function formatDate(date: string, bucket: Bucket, long = false) {
  const d = new Date(`${date}T00:00:00Z`);
  const text = d.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    ...(long ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
  return bucket === 'week' && long ? `Week of ${text}` : text;
}

const fmt = (n: number) => n.toLocaleString('en');

/** Evenly spaced x-axis label indices that will not collide. */
function labelIndices(count: number, plotWidth: number, minGap = 72) {
  if (count <= 1) return [0];
  const slots = Math.max(2, Math.min(count, Math.floor(plotWidth / minGap)));
  const result = new Set<number>();
  for (let i = 0; i < slots; i++) result.add(Math.round((i * (count - 1)) / (slots - 1)));
  return [...result];
}

// ── Legend, tooltip, table ───────────────────────────────────────────────────

export function Legend({ series, shape }: { series: ChartSeries[]; shape: 'bar' | 'line' }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--viz-ink-2)' }}>
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          {shape === 'bar' ? (
            <span className="inline-block w-2.5 h-2.5 rounded-xs" style={{ background: s.color }} aria-hidden />
          ) : (
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: s.color }} aria-hidden />
          )}
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ x, width, title, rows }: {
  x: number;
  width: number;
  title: string;
  rows: { label: string; value: number; color: string }[];
}) {
  const boxWidth = 168;
  const left = Math.min(Math.max(x - boxWidth / 2, 0), Math.max(0, width - boxWidth));
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        left,
        width: boxWidth,
        background: 'var(--viz-surface)',
        borderColor: 'var(--viz-axis)',
        color: 'var(--viz-ink-2)',
      }}
    >
      <p className="mb-1" style={{ color: 'var(--viz-muted)' }}>{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: r.color }} aria-hidden />
            {r.label}
          </span>
          <strong className="tabular-nums" style={{ color: 'var(--viz-ink)' }}>{fmt(r.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function ChartTable({ data, series, bucket }: { data: ChartPoint[]; series: ChartSeries[]; bucket: Bucket }) {
  return (
    <details className="mt-3 text-xs" style={{ color: 'var(--viz-ink-2)' }}>
      <summary className="cursor-pointer select-none" style={{ color: 'var(--viz-muted)' }}>Show table</summary>
      <div className="mt-2 max-h-64 overflow-auto">
        <table className="w-full tabular-nums">
          <thead>
            <tr style={{ color: 'var(--viz-muted)' }}>
              <th className="text-left font-medium py-1 pr-3">{bucket === 'week' ? 'Week of' : 'Date'}</th>
              {series.map((s) => <th key={s.key} className="text-right font-medium py-1 pl-3">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((p) => (
              <tr key={p.date} className="border-t" style={{ borderColor: 'var(--viz-grid)' }}>
                <td className="py-1 pr-3">{formatDate(p.date, 'day', true)}</td>
                {p.values.map((v, i) => <td key={series[i].key} className="text-right py-1 pl-3">{fmt(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ── Column chart (single or stacked) ─────────────────────────────────────────

const MARGIN = { top: 12, right: 8, bottom: 24, left: 36 };

/** Path for a column with a 4px rounded top (data-end) and a square base. */
function columnPath(x: number, yTop: number, w: number, h: number, rounded: boolean) {
  const r = rounded ? Math.min(4, w / 2, h) : 0;
  const yBottom = yTop + h;
  return `M${x},${yBottom}L${x},${yTop + r}Q${x},${yTop} ${x + r},${yTop}L${x + w - r},${yTop}Q${x + w},${yTop} ${x + w},${yTop + r}L${x + w},${yBottom}Z`;
}

export function ColumnChart({ data, series, bucket, height = 200, label }: {
  data: ChartPoint[];
  series: ChartSeries[];
  bucket: Bucket;
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const totals = data.map((p) => p.values.reduce((a, b) => a + b, 0));
  const { max, step } = niceScale(Math.max(0, ...totals));
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(1, Math.min(24, slot - 2));
  const y = (v: number) => MARGIN.top + plotH - (v / max) * plotH;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const peak = totals.indexOf(Math.max(...totals));

  return (
    <div className="viz-root">
      <div className="mb-3"><Legend series={series} shape="bar" /></div>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)}
                  stroke={t === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'} strokeWidth={1} shapeRendering="crispEdges" />
                <text x={MARGIN.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10}
                  fill="var(--viz-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}</text>
              </g>
            ))}

            {data.map((p, i) => {
              const x = MARGIN.left + i * slot + (slot - barW) / 2;
              const topSeries = p.values.reduce((top, v, s) => (v > 0 ? s : top), -1);
              let base = y(0);
              const dim = hover !== null && hover !== i;
              return (
                <g key={p.date} opacity={dim ? 0.45 : 1}>
                  {p.values.map((v, s) => {
                    if (v <= 0) return null;
                    const fullH = (v / max) * plotH;
                    // 2px surface gap between stacked segments.
                    const gap = base < y(0) ? 2 : 0;
                    const h = Math.max(0.5, fullH - gap);
                    const yTop = base - gap - h;
                    base = yTop;
                    return <path key={series[s].key} d={columnPath(x, yTop, barW, h, s === topSeries)} fill={series[s].color} />;
                  })}
                </g>
              );
            })}

            {/* Selective direct label: the peak column only. */}
            {totals[peak] > 0 && hover === null && (
              <text x={MARGIN.left + peak * slot + slot / 2} y={y(totals[peak]) - 5} textAnchor="middle"
                fontSize={10} fontWeight={600} fill="var(--viz-ink-2)">{fmt(totals[peak])}</text>
            )}

            {/* Edge labels anchor to the plot edges so they are never clipped. */}
            {labelIndices(data.length, plotW).map((i) => {
              const isFirst = i === 0;
              const isLast = i === data.length - 1 && data.length > 1;
              const x = isFirst ? MARGIN.left + (slot - barW) / 2
                : isLast ? MARGIN.left + i * slot + (slot + barW) / 2
                : MARGIN.left + i * slot + slot / 2;
              return (
                <text key={i} x={x} y={height - 6} textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
                  fontSize={10} fill="var(--viz-muted)">{formatDate(data[i].date, bucket)}</text>
              );
            })}

            {/* Hit targets: the full column slot, bigger than the painted bar. */}
            {data.map((p, i) => (
              <rect key={`hit-${p.date}`} x={MARGIN.left + i * slot} y={MARGIN.top} width={slot} height={plotH}
                fill="transparent" tabIndex={0} aria-label={`${formatDate(p.date, bucket, true)}: ${series.map((s, k) => `${s.label} ${p.values[k]}`).join(', ')}`}
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)} style={{ outline: 'none' }} />
            ))}
          </svg>
        )}
        {hover !== null && data[hover] && (
          <Tooltip
            x={MARGIN.left + hover * slot + slot / 2}
            width={width}
            title={formatDate(data[hover].date, bucket, true)}
            rows={series.map((s, k) => ({ label: s.label, value: data[hover].values[k], color: s.color }))}
          />
        )}
      </div>
      <ChartTable data={data} series={series} bucket={bucket} />
    </div>
  );
}

// ── Line chart (with crosshair) ──────────────────────────────────────────────

export function LineChart({ data, series, height = 220, label, estimatedBefore }: {
  data: ChartPoint[];
  series: ChartSeries[];
  height?: number;
  label: string;
  /** Dates before this are reconstructed rather than measured; shaded and labelled. */
  estimatedBefore?: string | null;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const n = data.length;
  const last = n - 1;
  const lastValues = n ? data[last].values : [];
  const { max, step } = niceScale(Math.max(0, ...data.flatMap((p) => p.values)));

  // Direct end labels only when they separate cleanly; otherwise the legend carries identity.
  const labelWidth = 64;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const yRaw = (v: number) => MARGIN.top + plotH - (v / max) * plotH;
  const endYs = lastValues.map(yRaw).sort((a, b) => a - b);
  const labelsFit = series.length <= 4 && endYs.every((v, i) => i === 0 || v - endYs[i - 1] >= 13);

  const right = labelsFit ? labelWidth : MARGIN.right;
  const plotW = Math.max(0, width - MARGIN.left - right);
  const x = (i: number) => MARGIN.left + (n <= 1 ? plotW / 2 : (i / last) * plotW);
  const y = yRaw;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);

  const estimatedEnd = estimatedBefore
    ? data.findIndex((p) => p.date >= estimatedBefore)
    : -1;
  const bandEnd = estimatedBefore ? (estimatedEnd === -1 ? last : estimatedEnd) : 0;

  function indexAt(clientX: number, target: SVGRectElement) {
    const box = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    return Math.round(ratio * last);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? last) - 1));
    else if (e.key === 'ArrowRight') setHover((h) => Math.min(last, (h ?? 0) + 1));
    else return;
    e.preventDefault();
  }

  return (
    <div className="viz-root">
      <div className="mb-3"><Legend series={series} shape="line" /></div>
      <div ref={ref} className="relative outline-none" style={{ height }} tabIndex={0}
        aria-label={`${label}. Use left and right arrow keys to read values.`}
        onKeyDown={onKey} onFocus={() => setHover(last)} onBlur={() => setHover(null)}>
        {width > 0 && n > 0 && (
          <svg width={width} height={height} role="img" aria-label={label}>
            <defs>
              <clipPath id={clipId}><rect x={MARGIN.left} y={0} width={plotW + 6} height={height} /></clipPath>
            </defs>

            {bandEnd > 0 && (
              <g>
                <rect x={x(0)} y={MARGIN.top} width={Math.max(0, x(bandEnd) - x(0))} height={plotH} fill="var(--viz-band)" />
                <text x={x(0) + 6} y={MARGIN.top + 11} fontSize={10} fill="var(--viz-muted)">Reconstructed</text>
              </g>
            )}

            {ticks.map((t) => (
              <g key={t}>
                <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(t)} y2={y(t)}
                  stroke={t === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'} strokeWidth={1} shapeRendering="crispEdges" />
                <text x={MARGIN.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10}
                  fill="var(--viz-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}</text>
              </g>
            ))}

            <g clipPath={`url(#${clipId})`}>
              {series.map((s, k) => (
                <path key={s.key} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                  d={data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.values[k])}`).join('')} />
              ))}
            </g>

            {/* End markers with a 2px surface ring, plus direct labels when they fit. */}
            {hover === null && series.map((s, k) => (
              <g key={`end-${s.key}`}>
                <circle cx={x(last)} cy={y(lastValues[k])} r={4} fill={s.color} stroke="var(--viz-surface)" strokeWidth={2} />
                {labelsFit && (
                  <text x={x(last) + 9} y={y(lastValues[k])} dy="0.32em" fontSize={11} fill="var(--viz-ink-2)">
                    {s.label} <tspan fontWeight={600} fill="var(--viz-ink)">{fmt(lastValues[k])}</tspan>
                  </text>
                )}
              </g>
            ))}

            {labelIndices(n, plotW).map((i) => (
              <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
                fontSize={10} fill="var(--viz-muted)">{formatDate(data[i].date, 'day')}</text>
            ))}

            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={MARGIN.top + plotH}
                  stroke="var(--viz-axis)" strokeWidth={1} shapeRendering="crispEdges" />
                {series.map((s, k) => (
                  <circle key={s.key} cx={x(hover)} cy={y(data[hover].values[k])} r={4}
                    fill={s.color} stroke="var(--viz-surface)" strokeWidth={2} />
                ))}
              </g>
            )}

            {/* Crosshair capture: the whole plot, so the pointer only has to find the date. */}
            <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} fill="transparent"
              onPointerMove={(e) => setHover(indexAt(e.clientX, e.currentTarget))}
              onPointerLeave={() => setHover(null)} />
          </svg>
        )}
        {hover !== null && data[hover] && (
          <Tooltip
            x={x(hover)}
            width={width}
            title={`${formatDate(data[hover].date, 'day', true)}${bandEnd > 0 && hover < bandEnd ? ' · reconstructed' : ''}`}
            rows={series.map((s, k) => ({ label: s.label, value: data[hover].values[k], color: s.color }))}
          />
        )}
      </div>
      <ChartTable data={data} series={series} bucket="day" />
    </div>
  );
}

// ── Ranked bar list (languages, countries, cities) ───────────────────────────

export type BarRow = {
  key: string;
  flag?: string;
  label: string;
  detail?: ReactNode;
  value: number;
  pct?: number;
};

export function BarList({ rows, initial = 8, empty }: { rows: BarRow[]; initial?: number; empty: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) {
    return <div className="py-8 text-center text-sm" style={{ color: 'var(--viz-muted)' }}>{empty}</div>;
  }

  const max = Math.max(...rows.map((r) => r.value), 1);
  const shown = expanded ? rows : rows.slice(0, initial);

  return (
    <div className="viz-root">
      <ol className="space-y-2.5">
        {shown.map((r) => (
          <li key={r.key} className="group rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-black/3 dark:hover:bg-white/4">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-baseline gap-2" style={{ color: 'var(--viz-ink)' }}>
                {r.flag && <span className="shrink-0 text-base leading-none" aria-hidden>{r.flag}</span>}
                <span className="truncate">{r.label}</span>
              </span>
              <span className="shrink-0 tabular-nums" style={{ color: 'var(--viz-ink)' }}>
                <strong className="font-semibold">{fmt(r.value)}</strong>
                {r.pct !== undefined && <span className="ml-1.5 text-xs" style={{ color: 'var(--viz-muted)' }}>{r.pct}%</span>}
              </span>
            </div>
            {/* 8px bar, square at the baseline, rounded data-end. */}
            <div className="mt-1.5 h-2 w-full">
              <div className="h-2 rounded-r-sm" style={{ width: `${Math.max(1, (r.value / max) * 100)}%`, background: 'var(--viz-1)' }} />
            </div>
            {r.detail && <div className="mt-1 text-xs" style={{ color: 'var(--viz-muted)' }}>{r.detail}</div>}
          </li>
        ))}
      </ol>
      {rows.length > initial && (
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
          {expanded ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}

// ── Part-to-whole bar ────────────────────────────────────────────────────────

export function PartToWholeBar({ parts }: { parts: { key: string; label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total === 0) {
    return <div className="py-6 text-center text-sm" style={{ color: 'var(--viz-muted)' }}>No data yet.</div>;
  }
  const visible = parts.filter((p) => p.value > 0);

  return (
    <div className="viz-root">
      {/* flex gap = the 2px surface gap between segments */}
      <div className="flex h-4 w-full gap-0.5" role="img"
        aria-label={visible.map((p) => `${p.label} ${p.value}`).join(', ')}>
        {visible.map((p, i) => (
          <div key={p.key} title={`${p.label}: ${fmt(p.value)} (${Math.round((p.value / total) * 100)}%)`}
            className={`h-full ${i === 0 ? 'rounded-l-sm' : ''} ${i === visible.length - 1 ? 'rounded-r-sm' : ''}`}
            style={{ flexGrow: p.value, flexBasis: 0, background: p.color }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: 'var(--viz-ink-2)' }}>
              <span className="inline-block w-2.5 h-2.5 rounded-xs" style={{ background: p.color }} aria-hidden />
              {p.label}
            </span>
            <span className="tabular-nums" style={{ color: 'var(--viz-ink)' }}>
              <strong className="font-semibold">{fmt(p.value)}</strong>
              <span className="ml-1.5 text-xs" style={{ color: 'var(--viz-muted)' }}>{Math.round((p.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
