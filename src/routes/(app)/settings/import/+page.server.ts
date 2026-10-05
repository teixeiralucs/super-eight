import { error, fail } from '@sveltejs/kit';
import type { z } from 'zod';
import {
	hiddenCollectionsSchema,
	importFilmsSchema,
	importListSchema,
	resolveSchema
} from '$lib/schemas/import';
import { importFilms, importHiddenCollections, importList, resolveFilms } from '$lib/server/import';
import { m } from '$lib/paraglide/messages';
import type { Actions } from './$types';

// Importador do Letterboxd (earlySetup.md §6.7). A página lê o .zip no navegador e chama
// estas actions em lotes (fetch + FormData com `payload` em JSON).

async function payload<S extends z.ZodType>(request: Request, schema: S) {
	const raw = (await request.formData()).get('payload');
	let json: unknown;
	try {
		json = JSON.parse(String(raw ?? ''));
	} catch {
		return null;
	}
	const parsed = schema.safeParse(json);
	return parsed.success ? (parsed.data as z.infer<S>) : null;
}

export const actions: Actions = {
	resolve: async ({ request, fetch }) => {
		const input = await payload(request, resolveSchema);
		if (!input) return fail(400, { message: m.import_error_batch() });
		return { matches: await resolveFilms(input.films, fetch) };
	},

	films: async ({ request, locals, fetch }) => {
		if (!locals.user) error(401);
		const input = await payload(request, importFilmsSchema);
		if (!input) return fail(400, { message: m.import_error_batch() });
		return { stats: await importFilms(locals.user.id, input.films, fetch) };
	},

	list: async ({ request, locals, fetch }) => {
		if (!locals.user) error(401);
		const input = await payload(request, importListSchema);
		if (!input) return fail(400, { message: m.import_error_batch() });
		return { added: await importList(locals.user.id, input, fetch) };
	},

	hidden: async ({ request, locals }) => {
		if (!locals.user) error(401);
		const input = await payload(request, hiddenCollectionsSchema);
		if (!input) return fail(400, { message: m.import_error_batch() });
		return { hidden: await importHiddenCollections(locals.user.id, input.collections) };
	}
};
