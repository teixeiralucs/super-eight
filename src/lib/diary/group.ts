import type { DiaryLogEntry, DiaryYear } from './types';

/**
 * Agrupa por ano e mês (datas em UTC, como no banco), preservando a ordem de chegada
 * — que já é da sessão mais recente para a mais antiga.
 */
export function groupDiary(entries: DiaryLogEntry[]): DiaryYear[] {
	const years: DiaryYear[] = [];
	for (const entry of entries) {
		const year = entry.watchedAt.getUTCFullYear();
		const month = entry.watchedAt.getUTCMonth();
		let y = years.at(-1);
		if (y?.year !== year) years.push((y = { year, months: [], count: 0 }));
		let m = y.months.at(-1);
		if (m?.month !== month) {
			y.months.push(
				(m = { key: `${year}-${String(month + 1).padStart(2, '0')}`, month, entries: [] })
			);
		}
		m.entries.push(entry);
		y.count++;
	}
	return years;
}

/** Sessões do mesmo filme, da primeira para a última, com o número de cada uma (1ª, 2ª…). */
export function movieHistory(entries: DiaryLogEntry[], movieId: number) {
	return entries
		.filter((entry) => entry.movie.id === movieId)
		.toReversed()
		.map((entry, index) => ({ entry, nth: index + 1 }));
}

const DAY_MS = 86_400_000;

/** Dias entre duas datas do diário (ambas meia-noite UTC). */
export const daysBetween = (from: Date, to: Date) =>
	Math.round((to.getTime() - from.getTime()) / DAY_MS);
