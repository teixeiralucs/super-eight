import { describe, expect, it } from 'vitest';
import { errorKey, isNoise } from './client-error';

describe('erros do navegador', () => {
	it('agrupa o mesmo erro mesmo com IDs, linhas e hashes diferentes', () => {
		const a = errorKey({
			message:
				'Keyed each block has duplicate key `/jQC1Q2bebR7gpVBVWnNKZaa6HaM.jpg` at indexes 3 and 7',
			stack: 'Error: x\n    at GalleryPanel (https://app/_app/immutable/chunks/AbC123.js:10:2001)',
			route: '/movie/[id]'
		});
		const b = errorKey({
			message:
				'Keyed each block has duplicate key `/q8eejQcg1bAqImEV8jh8RtBD4uH.jpg` at indexes 1 and 9',
			stack: 'Error: x\n    at GalleryPanel (https://app/_app/immutable/chunks/ZzZ999.js:12:88)',
			route: '/movie/[id]'
		});
		expect(a).toBe(b);
		expect(errorKey({ message: 'outro erro', route: '/movie/[id]' })).not.toBe(a);
	});

	it('ignora ruído de extensões e do navegador', () => {
		expect(isNoise({ message: 'Script error.' })).toBe(true);
		expect(isNoise({ message: 'x', stack: 'at y (chrome-extension://abc/content.js:1:1)' })).toBe(
			true
		);
		expect(
			isNoise({ message: 'ResizeObserver loop completed with undelivered notifications.' })
		).toBe(true);
		expect(isNoise({ message: 'Cannot read properties of undefined' })).toBe(false);
	});
});
