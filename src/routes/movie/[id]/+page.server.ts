import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import {
	artworkSchema,
	deleteSessionSchema,
	rateSchema,
	sessionSchema
} from '$lib/schemas/library';
import { setArtwork } from '$lib/server/artwork';
import {
	addToLibrary,
	deleteSession,
	getMovieUserData,
	LibraryRuleError,
	logSession,
	rate,
	removeFromLibrary,
	toggleFavorite
} from '$lib/server/library-actions';
import { getMovieFull, TMDbError } from '$lib/server/tmdb';
import type { Actions, PageServerLoad } from './$types';

function parseMovieId(raw: string) {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Filme não encontrado.');
	return id;
}

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const movieId = parseMovieId(params.id);

	const [movie, userData] = await Promise.all([
		getMovieFull(movieId, fetch).catch((err) => {
			if (err instanceof TMDbError && err.status === 404) error(404, 'Filme não encontrado.');
			throw err;
		}),
		locals.user ? getMovieUserData(locals.user.id, movieId) : null
	]);

	return { movie, userData, signedIn: Boolean(locals.user) };
};

/**
 * Envolve cada action: exige login, valida o formulário, converte violações de regra
 * em `fail(400)` e devolve o estado atualizado (o painel sobreposto se atualiza com ele).
 */
function action<S extends z.ZodType>(
	schema: S | ((now: Date) => S),
	run: (userId: string, movieId: number, input: z.infer<S>, event: RequestEvent) => Promise<void>
) {
	return async (event: RequestEvent) => {
		const { locals, params, request } = event;
		if (!locals.user) return fail(401, { message: 'Entre para salvar este filme.' });
		const movieId = parseMovieId(params.id ?? '');

		const resolved = typeof schema === 'function' ? schema(new Date()) : schema;
		const parsed = resolved.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		try {
			await run(locals.user.id, movieId, parsed.data, event);
		} catch (err) {
			if (err instanceof LibraryRuleError) return fail(400, { message: err.message });
			throw err;
		}
		return { userData: await getMovieUserData(locals.user.id, movieId) };
	};
}

const empty = z.object({});

export const actions: Actions = {
	// O estado não é escolhido à mão: "Assistido" vem de registrar sessão (logSession).
	add: action(empty, (userId, movieId, _input, { fetch }) => addToLibrary(userId, movieId, fetch)),
	remove: action(empty, (userId, movieId) => removeFromLibrary(userId, movieId)),
	rate: action(rateSchema, (userId, movieId, { rating }) => rate(userId, movieId, rating)),
	favorite: action(empty, (userId, movieId) => toggleFavorite(userId, movieId)),
	logSession: action(sessionSchema, (userId, movieId, input, { fetch }) =>
		logSession(userId, movieId, input, fetch)
	),
	deleteSession: action(deleteSessionSchema, (userId, _movieId, { sessionId }) =>
		deleteSession(userId, sessionId)
	),
	artwork: action(artworkSchema, (userId, movieId, { kind, path }, { fetch }) =>
		setArtwork(userId, movieId, kind, path, fetch)
	)
};
