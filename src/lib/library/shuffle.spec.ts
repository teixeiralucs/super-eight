import { describe, expect, it } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
	it('mantém os mesmos itens sem alterar o original', () => {
		const items = [1, 2, 3, 4, 5];
		const result = shuffle(items);
		expect([...result].sort()).toEqual(items);
		expect(items).toEqual([1, 2, 3, 4, 5]);
	});

	it('é determinístico com a mesma fonte de aleatoriedade', () => {
		const fixed = () => 0;
		expect(shuffle([1, 2, 3], fixed)).toEqual(shuffle([1, 2, 3], fixed));
	});
});
