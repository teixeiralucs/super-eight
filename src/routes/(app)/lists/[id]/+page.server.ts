import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { m } from '$lib/paraglide/messages';
import { listFieldsSchema, listMovieSchema, reorderSchema } from '$lib/schemas/lists';
import { LibraryRuleError } from '$lib/server/errors';
import { commentIdSchema, listCommentSchema } from '$lib/schemas/social';
import { deleteComment } from '$lib/server/reviews';
import {
	addListComment,
	deleteList,
	getList,
	getListComments,
	removeFromList,
	reorderList,
	toggleListLike,
	updateList
} from '$lib/server/lists';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const list = z.uuid().safeParse(params.id).success
		? await getList(params.id, locals.user?.id ?? null, locals.locale)
		: null;
	// Privada de outra pessoa = inexistente (não revela que existe).
	if (!list) error(404, m.error_list_not_found());
	const comments = await getListComments(list.id, locals.user?.id ?? null);
	return { list, comments, signedIn: Boolean(locals.user) };
};

/** Exige login, valida o formulário e converte regras violadas em `fail(400)`. */
function action<S extends z.ZodType>(
	schema: S,
	run: (userId: string, listId: string, input: z.infer<S>) => Promise<unknown>
) {
	return async ({ request, locals, params }: RequestEvent) => {
		if (!locals.user) return fail(401, { message: m.error_sign_in_to_save() });
		const form = Object.fromEntries(await request.formData());
		const parsed = schema.safeParse(form);
		if (!parsed.success) {
			return fail(400, {
				message: parsed.error.issues[0]?.message ?? m.error_invalid_data(),
				errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>
			});
		}
		try {
			await run(locals.user.id, params.id ?? '', parsed.data);
		} catch (err) {
			if (err instanceof LibraryRuleError) return fail(400, { message: err.message });
			throw err;
		}
		return { ok: true };
	};
}

export const actions: Actions = {
	update: action(listFieldsSchema, (userId, listId, fields) => updateList(userId, listId, fields)),
	remove: action(listMovieSchema, (userId, listId, { movieId }) =>
		removeFromList(userId, listId, movieId)
	),
	reorder: action(reorderSchema, (userId, listId, { order }) => reorderList(userId, listId, order)),
	like: action(z.object({}), (userId, listId) => toggleListLike(userId, listId)),
	comment: action(listCommentSchema, (userId, listId, { content }) =>
		addListComment(userId, listId, content)
	),
	deleteComment: action(commentIdSchema, (userId, _listId, { commentId }) =>
		deleteComment(userId, commentId)
	),
	delete: async (event) => {
		const result = await action(z.object({}), (userId, listId) => deleteList(userId, listId))(
			event
		);
		if ('ok' in result) redirect(303, '/lists');
		return result;
	}
};
