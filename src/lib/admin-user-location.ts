const countries = new Intl.DisplayNames(['en'], { type: 'region' });

export function locationCountry(code: string | null | undefined): string {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized) || normalized === 'XX' || normalized === 'T1') return 'Not available';
  const flag = [...normalized].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('');
  return `${flag} ${countries.of(normalized) ?? normalized}`;
}

export function locationActivityDate(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Not available';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString('en', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}
