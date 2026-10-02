import { describe, expect, it } from 'vitest';
import { deleteSessionSchema, rateSchema, sessionSchema } from './library';

const now = new Date('2026-09-30T15:00:00Z');

describe('rateSchema', () => {
	it('aceita 1 a 10 e vazio (limpar nota)', () => {
		expect(rateSchema.parse({ rating: '7' }).rating).toBe(7);
		expect(rateSchema.parse({ rating: '' }).rating).toBeNull();
	});

	it('recusa fora do intervalo e não inteiros', () => {
		expect(rateSchema.safeParse({ rating: '0' }).success).toBe(false);
		expect(rateSchema.safeParse({ rating: '11' }).success).toBe(false);
		expect(rateSchema.safeParse({ rating: '7.5' }).success).toBe(false);
	});
});

describe('sessionSchema', () => {
	const schema = sessionSchema(now);

	it('aceita hoje e o passado, com nota e anotação opcionais', () => {
		expect(schema.parse({ watchedAt: '2026-09-30', rating: '', note: '  ' })).toEqual({
			watchedAt: '2026-09-30',
			rating: null,
			note: null
		});
		expect(schema.parse({ watchedAt: '2019-01-01', rating: '9', note: 'Revi' }).rating).toBe(9);
	});

	it('recusa datas no futuro e inválidas', () => {
		expect(schema.safeParse({ watchedAt: '2026-10-05' }).success).toBe(false);
		expect(schema.safeParse({ watchedAt: '30/09/2026' }).success).toBe(false);
		expect(schema.safeParse({ watchedAt: '2026-02-31x' }).success).toBe(false);
	});

	it('limita a anotação', () => {
		expect(schema.safeParse({ watchedAt: '2026-09-01', note: 'a'.repeat(501) }).success).toBe(
			false
		);
	});
});

describe('deleteSessionSchema', () => {
	it('exige um UUID', () => {
		expect(deleteSessionSchema.safeParse({ sessionId: 'abc' }).success).toBe(false);
		expect(
			deleteSessionSchema.safeParse({ sessionId: '2b1a6f1e-8a5c-4a7e-9f39-1a2b3c4d5e6f' }).success
		).toBe(true);
	});
});
