import { z } from 'zod';
import { m } from '$lib/paraglide/messages';

// Validação das actions de listas (earlySetup.md §5.2.4).

const checkbox = z.preprocess((value) => value === 'on' || value === 'true', z.boolean());

export const listFieldsSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, { error: () => m.error_list_title_required() })
		.max(80, { error: () => m.error_list_title_too_long() }),
	description: z
		.string()
		.trim()
		.max(500, { error: () => m.error_list_description_too_long() })
		.optional()
		.transform((value) => value || null),
	kind: z.enum(['RANKED', 'COLLECTION']).catch('COLLECTION'),
	isPublic: checkbox
});

export const listIdSchema = z.object({ listId: z.uuid({ error: () => m.error_list_not_found() }) });

export const listMovieSchema = z.object({
	movieId: z.coerce
		.number()
		.int()
		.positive({ error: () => m.error_invalid_movie() })
});

/** Nova ordem de um ranking: IDs dos filmes separados por vírgula, do 1º ao último. */
export const reorderSchema = z.object({
	order: z
		.string()
		.regex(/^\d+(,\d+)*$/, { error: () => m.error_invalid_data() })
		.transform((value) => value.split(',').map(Number))
});

/** Criar lista a partir do pop-up do filme: só o título (o resto fica no padrão). */
export const quickListSchema = z.object({
	title: listFieldsSchema.shape.title
});

export type ListFields = z.infer<typeof listFieldsSchema>;
