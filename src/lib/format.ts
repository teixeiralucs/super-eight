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

const regionNames = new Intl.DisplayNames('pt-BR', { type: 'region' });

/** "US" → "Estados Unidos". Códigos inválidos voltam como estão. */
export function countryName(code: string) {
	try {
		return regionNames.of(code) ?? code;
	} catch {
		return code;
	}
}

/** Segunda linha dos cards: "Diretor, País, 2h 15min" (partes ausentes são omitidas). */
export function movieMetaLine(movie: {
	directors: string[];
	countries: string[];
	runtime: number | null;
}) {
	return [
		movie.directors.slice(0, 2).join(' & ') || null,
		movie.countries[0] ? countryName(movie.countries[0]) : null,
		movie.runtime ? formatDuration(movie.runtime) : null
	]
		.filter(Boolean)
		.join(', ');
}
