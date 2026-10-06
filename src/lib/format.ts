import { intlLocale } from '$lib/i18n';

// Formatação no idioma atual (ver $lib/i18n). Datas do diário são `@db.Date` (meia-noite
// UTC): formatar sempre em UTC evita o "dia anterior" no Brasil.

const formatters = new Map<string, Intl.DateTimeFormat>();

/** `Intl.DateTimeFormat` do idioma atual, criado uma vez por idioma + opções. */
function dateFormat(options: Intl.DateTimeFormatOptions) {
	const locale = intlLocale();
	const key = `${locale}|${JSON.stringify(options)}`;
	let format = formatters.get(key);
	if (!format) formatters.set(key, (format = new Intl.DateTimeFormat(locale, options)));
	return format;
}

export const formatShortDate = (date: Date) =>
	dateFormat({ day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
export const formatLongDate = (date: Date) =>
	dateFormat({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);

/** 315 → "5h 15min"; 60 → "1h"; 45 → "45min". */
export function formatDuration(minutes: number) {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (!h) return `${m}min`;
	return m ? `${h}h ${m}min` : `${h}h`;
}

export const yearOf = (date: Date | null) => (date ? date.getUTCFullYear() : null);

/** Sigla curta do país para os cards ("US", "BR"); "GB" vira o mais reconhecível "UK". */
export const countryCode = (code: string) =>
	code.toUpperCase() === 'GB' ? 'UK' : code.toUpperCase();

export interface MovieMeta {
	director: string | null;
	country: string | null;
	runtime: string | null;
}

/** Segunda linha dos cards: diretor, país e duração (partes ausentes ficam nulas). */
export function movieMeta(movie: {
	directors: string[];
	countries: string[];
	runtime: number | null;
}): MovieMeta {
	return {
		director: movie.directors.slice(0, 2).join(' & ') || null,
		country: movie.countries[0] ? countryCode(movie.countries[0]) : null,
		runtime: movie.runtime ? formatDuration(movie.runtime) : null
	};
}

/** Versão em texto corrido ("Diretor · País · 2h 15min"), para `title` e afins. */
export const movieMetaText = (meta: MovieMeta) =>
	[meta.director, meta.country, meta.runtime].filter(Boolean).join(' · ');

/** Hoje (ou `offsetDays` atrás) no fuso do navegador, em ISO (YYYY-MM-DD). */
export function todayIso(offsetDays = 0) {
	const now = new Date(Date.now() - offsetDays * 86_400_000);
	return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** "domingo" (datas do diário, em UTC). */
export const formatWeekday = (date: Date) =>
	dateFormat({ weekday: 'long', timeZone: 'UTC' }).format(date);
/** 8 → "setembro" (mês 0–11). */
/** "12-25" → "25 de dezembro" (dia de lançamento, sem ano). */
export const formatDayMonth = (monthDay: string) =>
	dateFormat({ day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
		new Date(`2000-${monthDay}T00:00:00Z`)
	);

export const formatMonthName = (month: number) =>
	dateFormat({ month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month, 1)));
/** 8 → "set" (mês 0–11), para eixos de gráfico. */
export const formatMonthShort = (month: number) =>
	dateFormat({ month: 'short', timeZone: 'UTC' })
		.format(new Date(Date.UTC(2000, month, 1)))
		.replace('.', '');

/** "Estados Unidos" / "United States" / "Estados Unidos" (ISO 3166-1). */
export function countryName(code: string) {
	try {
		return new Intl.DisplayNames(intlLocale(), { type: 'region' }).of(code) ?? code;
	} catch {
		return code;
	}
}

/** "japonês" / "Japanese" (ISO 639-1). */
export function languageName(code: string) {
	try {
		return new Intl.DisplayNames(intlLocale(), { type: 'language' }).of(code) ?? code;
	} catch {
		return code;
	}
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['week', 7 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60]
];

/** "há 3 dias" / "3 days ago" / "hace 3 días" (agora = "agora"). */
export function formatRelative(date: Date, now = new Date()) {
	const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
	const format = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' });
	for (const [unit, size] of RELATIVE_STEPS) {
		if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
	}
	return format.format(0, 'second');
}
