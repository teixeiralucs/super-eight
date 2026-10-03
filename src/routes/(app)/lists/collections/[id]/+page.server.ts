import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { addToLibrary } from '$lib/server/library-actions';
import { getUserCollection } from '$lib/server/collections';
import { m } from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

// Coleção do TMDb (earlySetup.md §6.8): só leitura. A única action adiciona um filme que
// falta ("fantasma") à biblioteca, como "Quero ver".
export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) error(401);
	const id = Number(params.id);
	const collection =
		Number.isInteger(id) && id > 0
			? await getUserCollection(locals.user.id, id, locals.locale)
			: null;
	if (!collection) error(404, m.error_collection_not_found());
	return { collection };
};

const addSchema = z.object({ movieId: z.coerce.number().int().positive() });

export const actions: Actions = {
	add: async ({ request, locals, fetch }) => {
		if (!locals.user) return fail(401, { message: m.error_sign_in_to_add() });
		const parsed = addSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: m.error_invalid_movie() });
		await addToLibrary(locals.user.id, parsed.data.movieId, fetch);
		return { added: parsed.data.movieId };
	}
};
