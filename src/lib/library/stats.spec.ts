import { describe, expect, it } from 'vitest';
import { computeStats, lastMonths } from './stats';

const now = new Date('2026-09-30T12:00:00Z');

describe('lastMonths', () => {
	it('gera 12 meses terminando no mês atual', () => {
		const months = lastMonths(now);
		expect(months).toHaveLength(12);
		expect(months[0].key).toBe('2025-10');
		expect(months.at(-1)?.key).toBe('2026-09');
	});
});

describe('computeStats', () => {
	const library = [
		{ status: 'WATCHED' as const, rating: 8, isFavorite: true, genres: ['Drama', 'Crime'] },
		{ status: 'WATCHED' as const, rating: 10, isFavorite: false, genres: ['Drama'] },
		{ status: 'WATCHED' as const, rating: null, isFavorite: false, genres: ['Terror'] },
		{ status: 'WANT_TO_WATCH' as const, rating: null, isFavorite: false, genres: ['Drama'] }
	];
	const diary = [
		{ watchedAt: new Date('2026-09-02T00:00:00Z'), runtime: 120 },
		{ watchedAt: new Date('2026-09-20T00:00:00Z'), runtime: 95 },
		{ watchedAt: new Date('2026-01-10T00:00:00Z'), runtime: null },
		{ watchedAt: new Date('2024-05-01T00:00:00Z'), runtime: 100 }
	];

	const stats = computeStats(library, diary, now);

	it('conta biblioteca, watchlist e favoritos', () => {
		expect(stats.watched).toBe(3);
		expect(stats.watchlist).toBe(1);
		expect(stats.favorites).toBe(1);
	});

	it('calcula a nota média só entre filmes avaliados', () => {
		expect(stats.averageRating).toBe(9);
	});

	it('soma sessões do ano e minutos de todas as sessões', () => {
		expect(stats.sessionsThisYear).toBe(3);
		expect(stats.minutesWatched).toBe(315);
	});

	it('distribui sessões por mês e ignora meses fora da janela', () => {
		expect(stats.monthly.find((m) => m.key === '2026-09')?.sessions).toBe(2);
		expect(stats.monthly.find((m) => m.key === '2026-01')?.sessions).toBe(1);
		expect(stats.monthly.reduce((sum, m) => sum + m.sessions, 0)).toBe(3);
	});

	it('ordena gêneros dos assistidos por frequência', () => {
		expect(stats.topGenres[0]).toEqual({ genre: 'Drama', count: 2 });
		expect(stats.topGenres.map((g) => g.genre)).not.toContain(undefined);
	});

	it('monta o histograma de notas de 1 a 10', () => {
		expect(stats.ratingHistogram).toHaveLength(10);
		expect(stats.ratingHistogram[7]).toEqual({ rating: 8, count: 1 });
		expect(stats.ratingHistogram[9]).toEqual({ rating: 10, count: 1 });
	});

	it('retorna média nula sem avaliações', () => {
		expect(computeStats([], [], now).averageRating).toBeNull();
	});
});
