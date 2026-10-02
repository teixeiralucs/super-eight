import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { m } from '$lib/paraglide/messages';
import { ensureMovie } from '$lib/server/movies';
import { searchPage } from '$lib/server/search';
import { searchPeople } from '$lib/server/social';
import { TMDbError } from '$lib/server/tmdb';
import { parseSearchQuery } from '$lib/search';
import type { Actions, PageServerLoad } from './$types';

// Busca orientada a URL (/search?q=batman): o link é compartilhável (earlySetup.md §6.1.3).
export const load: PageServerLoad = async ({ url, locals, fetch }) => {
	const ctx = { locale: locals.locale, region: locals.region, fetch };
	const q = parseSearchQuery(url.searchParams);
	const type = url.searchParams.get('type') === 'people' ? 'people' : 'movies';

	// Pessoas (§6.6): por @username ou nome; sem termo, nada (sem listar todo mundo).
	if (type === 'people') {
		const people = await searchPeople(q, locals.user?.id ?? null);
		return { q, type, people, failed: false, items: [], page: 1, totalPages: 1 };
	}

	try {
		return {
			q,
			type,
			people: [],
			failed: false,
			...(await searchPage(locals.user?.id ?? null, q, 1, ctx))
		};
	} catch (err) {
		console.error('[search] falha na busca:', err);
		return { q, type, people: [], failed: true, items: [], page: 1, totalPages: 1 };
	}
};

const addSchema = z.object({ movieId: z.coerce.number().int().positive() });

export const actions: Actions = {
	/** Adiciona à biblioteca como "Quero ver". Não rebaixa quem já está na biblioteca. */
	add: async ({ request, locals, fetch }) => {
		if (!locals.user) return fail(401, { message: m.error_sign_in_to_add() });

		const parsed = addSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: m.error_invalid_movie() });

		const { movieId } = parsed.data;
		try {
			await ensureMovie(movieId, fetch);
		} catch (err) {
			if (err instanceof TMDbError && err.status === 404) {
				return fail(404, { message: m.error_movie_not_found() });
			}
			throw err;
		}

		await prisma.libraryEntry.upsert({
			where: { userId_movieId: { userId: locals.user.id, movieId } },
			create: { userId: locals.user.id, movieId, status: 'WANT_TO_WATCH' },
			update: {}
		});

		return { added: movieId };
	}
};
