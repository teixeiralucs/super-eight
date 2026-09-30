import { describe, expect, it } from 'vitest';
import { countryName, formatDuration, formatShortDate, movieMetaLine, yearOf } from './format';

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

describe('movieMetaLine', () => {
	it('monta "diretor, país, duração"', () => {
		expect(
			movieMetaLine({ directors: ['Denis Villeneuve'], countries: ['US'], runtime: 166 })
		).toBe('Denis Villeneuve, Estados Unidos, 2h 46min');
	});

	it('junta até dois diretores e omite partes ausentes', () => {
		expect(movieMetaLine({ directors: ['A', 'B', 'C'], countries: [], runtime: null })).toBe(
			'A & B'
		);
		expect(movieMetaLine({ directors: [], countries: ['BR'], runtime: 90 })).toBe(
			'Brasil, 1h 30min'
		);
	});

	it('não quebra com código de país inválido', () => {
		expect(countryName('??')).toBe('??');
	});
});
