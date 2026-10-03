import { csvRecords, parseCsv } from './csv';
import type { ImportFilm, ImportList, LetterboxdExport } from './types';

/**
 * Lê o export do Letterboxd (Settings → Data → Export Your Data): os CSVs do .zip, já como
 * texto, com o caminho dentro do zip (ex.: "diary.csv", "lists/favoritos.csv").
 *
 * Regras (earlySetup.md §6.7):
 * - diary.csv → sessões (data assistida, nota, rewatch); o texto da review da mesma sessão
 *   (reviews.csv) vira a anotação.
 * - watched.csv sem nenhuma sessão → uma sessão na data em que foi marcado como visto
 *   (no Super Eight, "Assistido" vem do diário).
 * - ratings.csv → nota atual; likes/films.csv → favorito; watchlist.csv → Quero ver.
 * - reviews.csv → a mais recente de cada filme vira a review.
 * - lists/*.csv → listas.
 *
 * O diário e as reviews têm URI da sessão (não do filme), então a chave é nome + ano.
 */
export function parseLetterboxd(files: Map<string, string>): LetterboxdExport {
	const films = new Map<string, ImportFilm>();
	const film = (name: string, yearText: string) => {
		const year = Number.parseInt(yearText, 10) || null;
		const key = filmKey(name, year);
		let entry = films.get(key);
		if (!entry) {
			entry = {
				key,
				name: name.trim(),
				year,
				sessions: [],
				rating: null,
				liked: false,
				watchlist: false,
				review: null
			};
			films.set(key, entry);
		}
		return entry;
	};
	const records = (path: string) => {
		const text = files.get(path);
		return text ? csvRecords(parseCsv(text)) : [];
	};

	// Reviews por sessão (nome + ano + data assistida) e a mais recente por filme.
	const reviewBySession = new Map<string, string>();
	for (const row of records('reviews.csv')) {
		const text = cleanReview(row.Review ?? '');
		if (!row.Name || !text) continue;
		const target = film(row.Name, row.Year);
		const date = isoDate(row['Watched Date']) ?? isoDate(row.Date);
		if (date) reviewBySession.set(`${target.key}|${date}`, text);
		const written = isoDate(row.Date) ?? date ?? '';
		if (!target.review || written >= target.review.date) {
			target.review = { text, date: written };
		}
	}

	for (const row of records('diary.csv')) {
		const date = isoDate(row['Watched Date']) ?? isoDate(row.Date);
		if (!row.Name || !date) continue;
		const target = film(row.Name, row.Year);
		target.sessions.push({
			date,
			rating: toRating(row.Rating),
			rewatch: row.Rewatch?.trim().toLowerCase() === 'yes',
			note: reviewBySession.get(`${target.key}|${date}`) ?? null
		});
	}

	for (const row of records('ratings.csv')) {
		if (row.Name) film(row.Name, row.Year).rating = toRating(row.Rating);
	}

	for (const row of records('watched.csv')) {
		const date = isoDate(row.Date);
		if (!row.Name || !date) continue;
		const target = film(row.Name, row.Year);
		if (!target.sessions.length) {
			target.sessions.push({ date, rating: null, rewatch: false, note: null });
		}
	}

	for (const row of records('likes/films.csv')) {
		if (row.Name) film(row.Name, row.Year).liked = true;
	}

	for (const row of records('watchlist.csv')) {
		if (row.Name) film(row.Name, row.Year).watchlist = true;
	}

	const lists: ImportList[] = [];
	for (const [path, text] of files) {
		if (!/^lists\/[^/]+\.csv$/.test(path)) continue;
		const list = parseList(text, film);
		if (list) lists.push(list);
	}

	for (const entry of films.values()) {
		entry.sessions.sort((a, b) => a.date.localeCompare(b.date));
	}
	return { films: [...films.values()], lists };
}

export const filmKey = (name: string, year: number | null) =>
	`${name.trim().toLowerCase()}|${year ?? ''}`;

/**
 * Lista do Letterboxd: uma linha de versão, o cabeçalho e os dados da lista, uma linha em
 * branco e então os filmes ("Position,Name,Year,URL,Description").
 */
function parseList(
	text: string,
	film: (name: string, year: string) => ImportFilm
): ImportList | null {
	const rows = parseCsv(text);
	const metaHeader = rows.findIndex((row) => row[0] === 'Date' && row[1] === 'Name');
	const itemsHeader = rows.findIndex((row) => row[0] === 'Position' && row[1] === 'Name');
	const meta = metaHeader >= 0 ? csvRecords(rows.slice(metaHeader, metaHeader + 2))[0] : null;
	const title = meta?.Name?.trim();
	if (!title) return null;

	const items = itemsHeader >= 0 ? csvRecords(rows.slice(itemsHeader)) : [];
	const keys = items
		.filter((row) => row.Name)
		.sort((a, b) => Number(a.Position) - Number(b.Position))
		.map((row) => film(row.Name, row.Year).key);
	return {
		title,
		description: meta?.Description?.trim() || null,
		films: [...new Set(keys)]
	};
}

/** "3.5" estrelas → 7 (escala de 10 do Super Eight). */
function toRating(value: string | undefined) {
	const stars = Number.parseFloat(value ?? '');
	if (!Number.isFinite(stars) || stars <= 0) return null;
	return Math.min(10, Math.max(1, Math.round(stars * 2)));
}

function isoDate(value: string | undefined) {
	const date = value?.trim();
	return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	'#39': "'",
	apos: "'",
	nbsp: ' '
};

/** O Letterboxd exporta a review com um pouco de HTML (<i>, <b>, <br />). */
export function cleanReview(text: string) {
	return text
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>\s*<p>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, name: string) => ENTITIES[name])
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
