import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { listFieldsSchema } from '$lib/schemas/lists';
import { getUserCollections } from '$lib/server/collections';
import { countTraktPending, syncTraktForUser } from '$lib/server/trakt';
import { createList, getUserLists } from '$lib/server/lists';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	const [lists, collections, traktPending] = await Promise.all([
		getUserLists(locals.user.id, locals.locale),
		getUserCollections(locals.user.id, locals.locale),
		countTraktPending(locals.user.id)
	]);
	return { lists, collections, traktPending };
};

export const actions: Actions = {
	/** Um lote da busca de listas oficiais do Trakt (a aba Coleções chama até acabar). */
	syncTrakt: async ({ locals, fetch }) => {
		if (!locals.user) error(401);
		return syncTraktForUser(locals.user.id, fetch);
	},

	create: async ({ request, locals }) => {
		if (!locals.user) error(401);
		const form = Object.fromEntries(await request.formData());
		const parsed = listFieldsSchema.safeParse(form);
		if (!parsed.success) {
			return fail(400, { values: form, errors: z.flattenError(parsed.error).fieldErrors });
		}
		const list = await createList(locals.user.id, parsed.data);
		redirect(303, `/lists/${list.id}`);
	}
};
