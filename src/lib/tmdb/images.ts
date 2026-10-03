// URLs de imagem do TMDb são públicas; este módulo pode ser usado no cliente.
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

export const posterUrl = (path: string | null, size: PosterSize = 'w500') =>
	path ? `${IMAGE_BASE}/${size}${path}` : null;

export const backdropUrl = (path: string | null, size: BackdropSize = 'w1280') =>
	path ? `${IMAGE_BASE}/${size}${path}` : null;

/** Logo do título: SVG vai no original (vetor, leve); PNG no w500. */
export const logoUrl = (path: string | null) =>
	path ? `${IMAGE_BASE}/${path.endsWith('.svg') ? 'original' : 'w500'}${path}` : null;

/** srcset para pôsteres responsivos. */
export const posterSrcset = (path: string | null) =>
	path
		? (['w185', 'w342', 'w500', 'w780'] as const)
				.map((size) => `${IMAGE_BASE}/${size}${path} ${size.slice(1)}w`)
				.join(', ')
		: undefined;

/**
 * srcset para backdrops em tela cheia.
 * Para no w1280: o `original` chega a vários MB e, sob as vinhetas, a diferença é imperceptível.
 */
export const backdropSrcset = (path: string | null) =>
	path
		? (['w780', 'w1280'] as const)
				.map((size) => `${IMAGE_BASE}/${size}${path} ${size.slice(1)}w`)
				.join(', ')
		: undefined;
