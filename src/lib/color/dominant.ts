// Cor dominante de uma imagem, para tingir a página de detalhes (duotone estilo "Joker").

export const FALLBACK_TINT = '#bc6cff'; // Neon Purple

/** RGB (0–255) → HSL (h 0–360, s/l 0–1). */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	const [rn, gn, bn] = [r / 255, g / 255, b / 255];
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	const h =
		max === rn
			? (gn - bn) / d + (gn < bn ? 6 : 0)
			: max === gn
				? (bn - rn) / d + 2
				: (rn - gn) / d + 4;
	return [h * 60, s, l];
}

/**
 * Escolhe o matiz dominante entre pixels "coloridos" (ignora quase-preto, quase-branco e cinza),
 * ponderando por saturação, e devolve uma cor viva de luminosidade média.
 * `pixels` é um RGBA plano (ImageData.data).
 */
export function dominantHue(pixels: ArrayLike<number>): string {
	const BUCKETS = 24;
	const weights = new Array<number>(BUCKETS).fill(0);
	const sums = Array.from({ length: BUCKETS }, () => ({ h: 0, s: 0, w: 0 }));

	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i + 3] < 128) continue;
		const [h, s, l] = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
		if (l < 0.12 || l > 0.9 || s < 0.2) continue;
		const bucket = Math.floor(h / (360 / BUCKETS)) % BUCKETS;
		const weight = s * (1 - Math.abs(l - 0.5));
		weights[bucket] += weight;
		sums[bucket].h += h * weight;
		sums[bucket].s += s * weight;
		sums[bucket].w += weight;
	}

	const best = weights.indexOf(Math.max(...weights));
	if (weights[best] === 0) return FALLBACK_TINT;

	const hue = Math.round(sums[best].h / sums[best].w);
	const saturation = Math.round(Math.min(0.75, Math.max(0.45, sums[best].s / sums[best].w)) * 100);
	return `hsl(${hue} ${saturation}% 45%)`;
}

/** Lê a imagem (precisa de CORS liberado — o TMDb libera) e calcula a cor. Só no navegador. */
export async function dominantColor(url: string): Promise<string> {
	const image = new Image();
	image.crossOrigin = 'anonymous';
	image.src = url;
	await image.decode();

	const canvas = document.createElement('canvas');
	canvas.width = 24;
	canvas.height = 36;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) return FALLBACK_TINT;
	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	return dominantHue(context.getImageData(0, 0, canvas.width, canvas.height).data);
}
