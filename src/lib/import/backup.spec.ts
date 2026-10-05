import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, backupToImport, isBackup, type Backup } from './backup';

const backup: Backup = {
	format: BACKUP_FORMAT,
	version: 1,
	exportedAt: '2026-10-05T12:00:00.000Z',
	profile: {
		username: 'teste',
		name: null,
		bio: null,
		locale: 'pt',
		region: 'BR',
		isPrivate: false
	},
	films: [
		{
			tmdbId: 496243,
			title: '기생충',
			year: 2019,
			status: 'WATCHED',
			rating: 10,
			isFavorite: true,
			addedAt: '2026-01-01T00:00:00.000Z',
			sessions: [{ date: '2025-05-01', rating: 10, rewatch: false, note: 'Obra-prima' }],
			review: { content: 'Uau', containsSpoilers: true, createdAt: '2025-05-02T10:00:00.000Z' },
			artwork: { posterPath: '/p.jpg', backdropPath: null, logoPath: null }
		},
		{
			tmdbId: 438631,
			title: 'Dune',
			year: 2021,
			status: 'WANT_TO_WATCH',
			rating: null,
			isFavorite: false,
			addedAt: null,
			sessions: [],
			review: null,
			artwork: null
		}
	],
	lists: [
		{
			title: 'Top',
			description: null,
			kind: 'RANKED',
			isPublic: true,
			createdAt: '2026-01-01T00:00:00.000Z',
			items: [
				{ tmdbId: 348, title: 'Alien', year: 1979, note: null },
				{ tmdbId: 496243, title: '기생충', year: 2019, note: null }
			]
		}
	],
	hiddenCollections: [{ source: 'trakt', id: 7 }]
};

describe('backup', () => {
	it('reconhece só o formato do Super Eight', () => {
		expect(isBackup(backup)).toBe(true);
		expect(isBackup({ films: [] })).toBe(false);
		expect(isBackup(null)).toBe(false);
	});

	it('vira o formato do importador, já com IDs e o que só o Super Eight tem', () => {
		const data = backupToImport(backup);
		const parasite = data.films.find((f) => f.tmdbId === 496243)!;
		expect(parasite).toMatchObject({
			key: 'tmdb:496243',
			rating: 10,
			liked: true,
			watchlist: false,
			review: { text: 'Uau', date: '2025-05-02', spoilers: true },
			artwork: { posterPath: '/p.jpg' }
		});
		expect(data.films.find((f) => f.tmdbId === 438631)?.watchlist).toBe(true);
		// Filme só da lista também ganha registro (para a lista achar o ID).
		expect(data.films.find((f) => f.tmdbId === 348)?.sessions).toEqual([]);
		expect(data.lists).toEqual([
			{
				title: 'Top',
				description: null,
				kind: 'RANKED',
				isPublic: true,
				films: ['tmdb:348', 'tmdb:496243']
			}
		]);
		expect(data.hiddenCollections).toEqual([{ source: 'trakt', id: 7 }]);
	});
});
