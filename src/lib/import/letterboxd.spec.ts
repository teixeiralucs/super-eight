import { describe, expect, it } from 'vitest';
import { csvRecords, parseCsv } from './csv';
import { cleanReview, filmKey, parseLetterboxd } from './letterboxd';

describe('parseCsv', () => {
	it('lê aspas, vírgulas, quebras de linha e aspas duplicadas', () => {
		const rows = parseCsv('﻿a,b\r\n"x, y","linha 1\nlinha 2 ""citação"""\n');
		expect(rows).toEqual([
			['a', 'b'],
			['x, y', 'linha 1\nlinha 2 "citação"']
		]);
		expect(csvRecords(rows)).toEqual([{ a: 'x, y', b: 'linha 1\nlinha 2 "citação"' }]);
	});
});

describe('cleanReview', () => {
	it('tira o HTML do Letterboxd e mantém as quebras', () => {
		expect(cleanReview('<i>Uau</i>.<br />Segundo &amp; último<br/>')).toBe(
			'Uau.\nSegundo & último'
		);
	});
});

const files = (entries: Record<string, string>) => new Map(Object.entries(entries));

describe('parseLetterboxd', () => {
	const data = parseLetterboxd(
		files({
			'diary.csv': [
				'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date',
				'2024-01-03,Parasite,2019,https://boxd.it/a,4.5,,,2024-01-02',
				'2025-05-01,Parasite,2019,https://boxd.it/b,5,Yes,,2025-05-01'
			].join('\n'),
			'reviews.csv': [
				'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date',
				'2024-01-03,Parasite,2019,https://boxd.it/a,4.5,,"Primeira, ótima",,2024-01-02',
				'2025-05-02,Parasite,2019,https://boxd.it/b,5,Yes,Ainda melhor,,2025-05-01'
			].join('\n'),
			'ratings.csv': [
				'Date,Name,Year,Letterboxd URI,Rating',
				'2025-05-01,Parasite,2019,https://boxd.it/f1,5',
				'2020-02-02,Alien,1979,https://boxd.it/f2,3'
			].join('\n'),
			'watched.csv': [
				'Date,Name,Year,Letterboxd URI',
				'2024-01-03,Parasite,2019,https://boxd.it/f1',
				'2020-02-02,Alien,1979,https://boxd.it/f2'
			].join('\n'),
			'likes/films.csv': 'Date,Name,Year,Letterboxd URI\n2020-02-02,Alien,1979,https://boxd.it/f2',
			'watchlist.csv': 'Date,Name,Year,Letterboxd URI\n2021-01-01,Dune,2021,https://boxd.it/f3',
			'deleted/diary.csv':
				'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2020-01-01,Apagado,2000,x,1,,,2020-01-01',
			'lists/top.csv': [
				'Letterboxd list export v7',
				'Date,Name,Tags,URL,Description',
				'2024-01-01,Meus favoritos,,https://letterboxd.com/x/list/top/,Os melhores',
				'',
				'Position,Name,Year,URL,Description',
				'2,Alien,1979,https://boxd.it/f2,',
				'1,Parasite,2019,https://boxd.it/f1,'
			].join('\n')
		})
	);
	const film = (name: string, year: number) =>
		data.films.find((f) => f.key === filmKey(name, year));

	it('junta diário, reviews e notas do mesmo filme', () => {
		const parasite = film('Parasite', 2019)!;
		expect(parasite.sessions).toEqual([
			{ date: '2024-01-02', rating: 9, rewatch: false, note: 'Primeira, ótima' },
			{ date: '2025-05-01', rating: 10, rewatch: true, note: 'Ainda melhor' }
		]);
		expect(parasite.rating).toBe(10);
		expect(parasite.review).toEqual({ text: 'Ainda melhor', date: '2025-05-02' });
	});

	it('visto sem diário ganha sessão na data marcada; curtida vira favorito', () => {
		const alien = film('Alien', 1979)!;
		expect(alien.sessions).toEqual([
			{ date: '2020-02-02', rating: null, rewatch: false, note: null }
		]);
		expect(alien.rating).toBe(6);
		expect(alien.liked).toBe(true);
	});

	it('Quero ver, listas na ordem e pastas ignoradas', () => {
		expect(film('Dune', 2021)?.watchlist).toBe(true);
		expect(film('Apagado', 2000)).toBeUndefined();
		expect(data.lists).toEqual([
			{
				title: 'Meus favoritos',
				description: 'Os melhores',
				films: [filmKey('Parasite', 2019), filmKey('Alien', 1979)]
			}
		]);
	});
});
