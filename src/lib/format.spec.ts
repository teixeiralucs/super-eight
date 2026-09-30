import { describe, expect, it } from 'vitest';
import {
	countryName,
	formatDuration,
	formatShortDate,
	movieMeta,
	movieMetaText,
	yearOf
} from './format';

describe('formatDuration', () => {
	it('formata horas e minutos', () => {
		expect(formatDuration(315)).toBe('5h 15min');
		expect(formatDuration(60)).toBe('1h');
		expect(formatDuration(45)).toBe('45min');
		expect(formatDuration(0)).toBe('0min');
	});
});

describe('datas @db.Date', () => {
	it('não voltam um dia por causa do fuso', () => {
		const date = new Date('2026-09-12T00:00:00Z');
		expect(formatShortDate(date)).toMatch(/^12 /);
		expect(yearOf(new Date('2026-01-01T00:00:00Z'))).toBe(2026);
	});
});

describe('movieMeta', () => {
	it('separa diretor, país traduzido e duração', () => {
		const meta = movieMeta({ directors: ['Denis Villeneuve'], countries: ['US'], runtime: 166 });
		expect(meta).toEqual({
			director: 'Denis Villeneuve',
			country: 'Estados Unidos',
			runtime: '2h 46min'
		});
		expect(movieMetaText(meta)).toBe('Denis Villeneuve · Estados Unidos · 2h 46min');
	});

	it('junta até dois diretores e omite partes ausentes', () => {
		expect(movieMeta({ directors: ['A', 'B', 'C'], countries: [], runtime: null })).toEqual({
			director: 'A & B',
			country: null,
			runtime: null
		});
		expect(movieMetaText(movieMeta({ directors: [], countries: ['BR'], runtime: 90 }))).toBe(
			'Brasil · 1h 30min'
		);
	});

	it('não quebra com código de país inválido', () => {
		expect(countryName('??')).toBe('??');
	});
});
