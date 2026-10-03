import { describe, expect, it } from 'vitest';
import { daysBetween, groupDiary, movieHistory } from './group';
import type { DiaryLogEntry } from './types';

const entry = (id: string, date: string, movieId = 1): DiaryLogEntry => ({
	id,
	watchedAt: new Date(`${date}T00:00:00Z`),
	rating: null,
	isRewatch: false,
	note: null,
	createdAt: new Date(`${date}T12:00:00Z`),
	library: null,
	movie: {
		id: movieId,
		title: `Filme ${movieId}`,
		originalTitle: `Movie ${movieId}`,
		posterPath: null,
		backdropPath: null,
		logoPath: null,
		releaseDate: null,
		runtime: null,
		genreIds: [],
		directors: [],
		countries: []
	}
});

describe('groupDiary', () => {
	it('agrupa por ano e mês mantendo a ordem (mais recente primeiro)', () => {
		const years = groupDiary([
			entry('a', '2026-09-28'),
			entry('b', '2026-09-01'),
			entry('c', '2026-01-31'),
			entry('d', '2025-12-31')
		]);
		expect(years.map((y) => [y.year, y.count])).toEqual([
			[2026, 3],
			[2025, 1]
		]);
		expect(years[0].months.map((m) => [m.key, m.entries.map((e) => e.id)])).toEqual([
			['2026-09', ['a', 'b']],
			['2026-01', ['c']]
		]);
	});

	it('usa a data em UTC (meia-noite não vira o dia anterior)', () => {
		expect(groupDiary([entry('a', '2026-10-01')])[0].months[0].month).toBe(9);
	});
});

describe('movieHistory', () => {
	it('lista as sessões do filme da primeira para a última, numeradas', () => {
		const history = movieHistory(
			[entry('c', '2026-09-28'), entry('x', '2026-05-01', 2), entry('a', '2024-01-01')],
			1
		);
		expect(history.map((h) => [h.entry.id, h.nth])).toEqual([
			['a', 1],
			['c', 2]
		]);
	});
});

describe('daysBetween', () => {
	it('conta dias inteiros', () => {
		expect(daysBetween(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-28T00:00:00Z'))).toBe(
			27
		);
	});
});
