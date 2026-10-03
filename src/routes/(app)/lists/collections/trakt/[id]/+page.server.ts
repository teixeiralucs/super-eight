import { error } from '@sveltejs/kit';
import { addMissing, getUserTraktList } from '$lib/server/collections';
import { m } from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

// Lista oficial do Trakt (earlySetup.md §6.8.5): só leitura; a única action adiciona um fantasma.
export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) error(401);
	const id = Number(params.id);
	const collection =
		Number.isInteger(id) && id > 0
			? await getUserTraktList(locals.user.id, id, locals.locale)
			: null;
	if (!collection) error(404, m.error_collection_not_found());
	return { collection };
};

export const actions: Actions = { add: addMissing };
