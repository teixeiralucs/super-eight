import { describe, expect, it } from 'vitest';
import { computeInsights, sessionYears, type InsightMovie } from './insights';

const movie = (id: number, extra: Partial<InsightMovie> = {}): InsightMovie => ({
	id,
	runtime: 100,
	releaseYear: 1980,
	genreIds: [27],
	countries: ['US'],
	originalLanguage: 'en',
	directorIds: [],
	writerIds: [],
	castIds: [],
	composerIds: [],
	studioIds: [],
	...extra
});

const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('computeInsights', () => {
	const movies = new Map([
		[1, movie(1, { directorIds: [10], castIds: [20, 21], runtime: 120, releaseYear: 1975 })],
		[2, movie(2, { directorIds: [10], castIds: [20], countries: ['IT'], originalLanguage: 'it' })],
		[3, movie(3, { directorIds: [11], runtime: 90, releaseYear: 2001 })]
	]);
	const entries = new Map([
		[1, { rating: 9, isFavorite: true }],
		[2, { rating: 7, isFavorite: false }],
		[3, { rating: null, isFavorite: false }]
	]);
	const sessions = [
		{ movieId: 1, watchedAt: at('2024-03-10'), isRewatch: false },
		{ movieId: 1, watchedAt: at('2025-01-05'), isRewatch: false }, // revisão (já visto em 2024)
		{ movieId: 2, watchedAt: at('2025-01-06'), isRewatch: false },
		{ movieId: 3, watchedAt: at('2025-07-20'), isRewatch: false },
		{ movieId: 3, watchedAt: at('2025-07-21'), isRewatch: false }
	];

	it('conta só o período e detecta revisões pela primeira sessão de todas', () => {
		const stats = computeInsights(sessions, movies, entries, 2025);
		expect(stats.sessions).toBe(4);
		expect(stats.films).toBe(3);
		expect(stats.newFilms).toBe(2);
		expect(stats.rewatches).toBe(2);
		expect(stats.minutes).toBe(120 + 100 + 90 + 90);
		expect(stats.averageRating).toBe(8);
		expect(stats.favorites).toBe(1);
		expect(stats.timeline).toHaveLength(12);
		expect(stats.timeline[0]).toEqual({ key: '2025-01', sessions: 2, minutes: 220 });
		expect(stats.weekdays.reduce((a, b) => a + b)).toBe(4);
	});

	it('ranqueia por filmes distintos, desempatando pela nota', () => {
		const stats = computeInsights(sessions, movies, entries, 2025);
		expect(stats.ranks.director[0]).toEqual({ key: 10, count: 2, averageRating: 8 });
		expect(stats.ranks.cast.map((item) => item.key)).toEqual([20, 21]);
		expect(stats.ranks.country[0].key).toBe('US');
		expect(stats.ranks.decade.map((item) => item.key)).toEqual([1970, 1980, 2000]);
	});

	it('destaques: mais bem avaliados, mais revisto, primeiro e último', () => {
		const stats = computeInsights(sessions, movies, entries, 2025);
		expect(stats.highlights.topRated).toEqual([1, 2]);
		expect(stats.highlights.mostWatched).toEqual({ movieId: 3, sessions: 2 });
		expect(stats.highlights.longest).toBe(1);
		expect(stats.highlights.oldest).toBe(1);
		expect(stats.highlights.first?.movieId).toBe(1);
		expect(stats.highlights.last?.movieId).toBe(3);
	});

	it('"all" usa todas as sessões e uma coluna por ano', () => {
		const stats = computeInsights(sessions, movies, entries, 'all');
		expect(stats.sessions).toBe(5);
		expect(stats.rewatches).toBe(2);
		expect(stats.timeline.map((bucket) => [bucket.key, bucket.sessions])).toEqual([
			['2024', 1],
			['2025', 4]
		]);
		expect(sessionYears(sessions)).toEqual([2025, 2024]);
	});
});
