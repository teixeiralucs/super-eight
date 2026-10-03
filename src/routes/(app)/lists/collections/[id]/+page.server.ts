import { error } from '@sveltejs/kit';
import { getUserCollection } from '$lib/server/collections';
import { m } from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

// Coleção do TMDb (earlySetup.md §6.8): só leitura; sem actions.
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
