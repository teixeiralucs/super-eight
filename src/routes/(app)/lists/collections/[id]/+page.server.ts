import { error } from '@sveltejs/kit';
import { addMissing, setCollectionHidden, getUserCollection } from '$lib/server/collections';
import { m } from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

// Saga do TMDb (earlySetup.md §6.8): só leitura. Actions: adicionar um fantasma e ocultar/mostrar.
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

export const actions: Actions = { add: addMissing, hide: setCollectionHidden };
