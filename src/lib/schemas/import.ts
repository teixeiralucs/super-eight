import { z } from 'zod';

// Lotes do importador do Letterboxd e da restauração de backup (earlySetup.md §6.7, §6.9). Chegam como JSON num campo
// `payload` do formulário; os limites mantêm cada chamada curta.

export const RESOLVE_BATCH = 40;
export const FILMS_BATCH = 20;
/** Filmes por chamada de uma lista (listas grandes vão em partes; a mesma lista é reaproveitada). */
export const LIST_CHUNK = 50;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rating = z.number().int().min(1).max(10).nullable();
const tmdbId = z.number().int().positive();
/** Caminho de imagem do TMDb (ex.: "/abc.jpg"), como na action da Galeria. */
const imagePath = z
	.string()
	.regex(/^\/[\w-]+\.(jpg|jpeg|png|webp|svg)$/)
	.nullable();

export const resolveSchema = z.object({
	films: z
		.array(
			z.object({
				key: z.string().max(400),
				name: z.string().trim().min(1).max(300),
				year: z.number().int().min(1870).max(2100).nullable()
			})
		)
		.max(RESOLVE_BATCH)
});

export const importFilmsSchema = z.object({
	films: z
		.array(
			z.object({
				tmdbId,
				sessions: z
					.array(
						z.object({
							date: isoDate,
							rating,
							rewatch: z.boolean(),
							note: z.string().max(20000).nullable()
						})
					)
					.max(500),
				rating,
				liked: z.boolean(),
				watchlist: z.boolean(),
				review: z
					.object({
						text: z.string().max(20000),
						date: z.string().max(10),
						spoilers: z.boolean().optional()
					})
					.nullable(),
				artwork: z
					.object({ posterPath: imagePath, backdropPath: imagePath, logoPath: imagePath })
					.nullable()
					.optional()
			})
		)
		.max(FILMS_BATCH)
});

export const importListSchema = z.object({
	title: z.string().trim().min(1).max(300),
	description: z.string().max(5000).nullable(),
	kind: z.enum(['RANKED', 'COLLECTION']).optional(),
	isPublic: z.boolean().optional(),
	movieIds: z.array(tmdbId).max(LIST_CHUNK)
});

export const hiddenCollectionsSchema = z.object({
	collections: z.array(z.object({ source: z.enum(['tmdb', 'trakt']), id: tmdbId })).max(1000)
});

export type ResolveInput = z.infer<typeof resolveSchema>;
export type ImportFilmsInput = z.infer<typeof importFilmsSchema>;
export type ImportListInput = z.infer<typeof importListSchema>;
