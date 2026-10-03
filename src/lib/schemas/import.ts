import { z } from 'zod';

// Lotes do importador do Letterboxd (earlySetup.md §6.7). Chegam como JSON num campo
// `payload` do formulário; os limites mantêm cada chamada curta.

export const RESOLVE_BATCH = 40;
export const FILMS_BATCH = 20;
/** Filmes por chamada de uma lista (listas grandes vão em partes; a mesma lista é reaproveitada). */
export const LIST_CHUNK = 50;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rating = z.number().int().min(1).max(10).nullable();
const tmdbId = z.number().int().positive();

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
				review: z.object({ text: z.string().max(20000), date: z.string().max(10) }).nullable()
			})
		)
		.max(FILMS_BATCH)
});

export const importListSchema = z.object({
	title: z.string().trim().min(1).max(300),
	description: z.string().max(5000).nullable(),
	movieIds: z.array(tmdbId).max(LIST_CHUNK)
});

export type ResolveInput = z.infer<typeof resolveSchema>;
export type ImportFilmsInput = z.infer<typeof importFilmsSchema>;
export type ImportListInput = z.infer<typeof importListSchema>;
