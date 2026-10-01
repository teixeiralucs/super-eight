// Datas do diário são `@db.Date` (meia-noite UTC): formatar sempre em UTC evita o "dia anterior" no Brasil.

const shortDate = new Intl.DateTimeFormat('pt-BR', {
	day: '2-digit',
	month: 'short',
	timeZone: 'UTC'
});
const longDate = new Intl.DateTimeFormat('pt-BR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

export const formatShortDate = (date: Date) => shortDate.format(date).replace('.', '');
export const formatLongDate = (date: Date) => longDate.format(date);

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
