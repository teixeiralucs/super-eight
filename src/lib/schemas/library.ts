import { z } from 'zod';

// Validação das actions da página de filme (earlySetup.md §5.2.2–5.2.3, §5.3.1).

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Hoje (YYYY-MM-DD) com folga de um dia para fusos à frente de UTC. */
const latestAllowedDate = (now: Date) =>
	new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const optionalRating = z.preprocess(
	(value) => (value === '' || value === null || value === undefined ? null : value),
	z.coerce
		.number()
		.int({ error: 'A nota deve ser um número inteiro.' })
		.min(1, { error: 'A nota vai de 1 a 10.' })
		.max(10, { error: 'A nota vai de 1 a 10.' })
		.nullable()
);

export const statusSchema = z.object({
	status: z.enum(['WANT_TO_WATCH', 'WATCHED'], { error: 'Status inválido.' })
});

export const rateSchema = z.object({ rating: optionalRating });

export const sessionSchema = (now = new Date()) =>
	z.object({
		watchedAt: z
			.string()
			.regex(ISO_DATE, { error: 'Data inválida.' })
			.refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
				error: 'Data inválida.'
			})
			.refine((value) => value <= latestAllowedDate(now), {
				error: 'A data não pode estar no futuro.'
			}),
		rating: optionalRating,
		note: z
			.string()
			.trim()
			.max(500, { error: 'A anotação pode ter até 500 caracteres.' })
			.optional()
			.transform((value) => value || null)
	});

export const deleteSessionSchema = z.object({ sessionId: z.uuid({ error: 'Sessão inválida.' }) });

export type SessionInput = z.infer<ReturnType<typeof sessionSchema>>;
