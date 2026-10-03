import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { listFieldsSchema } from '$lib/schemas/lists';
import { getUserCollections } from '$lib/server/collections';
import { createList, getUserLists } from '$lib/server/lists';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	const [lists, collections] = await Promise.all([
		getUserLists(locals.user.id, locals.locale),
		getUserCollections(locals.user.id, locals.locale)
	]);
	return { lists, collections };
};

export const actions: Actions = {
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
