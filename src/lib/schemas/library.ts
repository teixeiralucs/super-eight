import { z } from 'zod';
import { m } from '$lib/paraglide/messages';

// Validação das actions da página de filme (earlySetup.md §5.2.2–5.2.3, §5.3.1).

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Hoje (YYYY-MM-DD) com folga de um dia para fusos à frente de UTC. */
const latestAllowedDate = (now: Date) =>
	new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const optionalRating = z.preprocess(
	(value) => (value === '' || value === null || value === undefined ? null : value),
	z.coerce
		.number()
		.int({ error: () => m.error_rating_integer() })
		.min(1, { error: () => m.error_rating_range() })
		.max(10, { error: () => m.error_rating_range() })
		.nullable()
);

export const rateSchema = z.object({ rating: optionalRating });

export const sessionSchema = (now = new Date()) =>
	z.object({
		watchedAt: z
			.string()
			.regex(ISO_DATE, { error: () => m.error_invalid_date() })
			.refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
				error: () => m.error_invalid_date()
			})
			.refine((value) => value <= latestAllowedDate(now), {
				error: () => m.error_future_date()
			}),
		rating: optionalRating,
		note: z
			.string()
			.trim()
			.max(500, { error: () => m.error_note_too_long() })
			.optional()
			.transform((value) => value || null)
	});

/** Caminho de imagem do TMDb (ex.: "/abc123.jpg"); vazio = restaurar o padrão. */
export const artworkSchema = z.object({
	kind: z.enum(['poster', 'backdrop', 'logo'], { error: () => m.error_invalid_image_kind() }),
	path: z.preprocess(
		(value) => (value === '' ? null : value),
		z
			.string()
			.regex(/^\/[\w-]+\.(jpg|jpeg|png|webp|svg)$/, { error: () => m.error_invalid_image() })
			.nullable()
	)
});

export const deleteSessionSchema = z.object({
	sessionId: z.uuid({ error: () => m.error_invalid_session() })
});

export type SessionInput = z.infer<ReturnType<typeof sessionSchema>>;
