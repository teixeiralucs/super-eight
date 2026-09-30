import { describe, expect, it } from 'vitest';
import { dominantHue, FALLBACK_TINT, rgbToHsl } from './dominant';

const pixels = (...colors: [number, number, number][]) =>
	colors.flatMap(([r, g, b]) => [r, g, b, 255]);

describe('rgbToHsl', () => {
	it('converte cores primárias', () => {
		expect(rgbToHsl(255, 0, 0)).toEqual([0, 1, 0.5]);
		expect(rgbToHsl(0, 255, 0)[0]).toBe(120);
		expect(rgbToHsl(0, 0, 255)[0]).toBe(240);
		expect(rgbToHsl(128, 128, 128)[1]).toBe(0);
	});
});

describe('dominantHue', () => {
	it('encontra o matiz predominante ignorando preto, branco e cinza', () => {
		const color = dominantHue(
			pixels(
				[0, 0, 0],
				[255, 255, 255],
				[120, 120, 120],
				[20, 160, 90],
				[30, 170, 100],
				[25, 150, 85],
				[200, 30, 30]
			)
		);
		const hue = Number(color.match(/hsl\((\d+)/)?.[1]);
		expect(hue).toBeGreaterThan(130);
		expect(hue).toBeLessThan(160);
		expect(color).toMatch(/45%\)$/);
	});

	it('usa a cor padrão quando a imagem não tem cor', () => {
		expect(dominantHue(pixels([0, 0, 0], [250, 250, 250], [128, 128, 128]))).toBe(FALLBACK_TINT);
	});
});
