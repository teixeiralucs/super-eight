import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { getComments } from '$lib/server/reviews';
import type { RequestHandler } from './$types';

// Exceção permitida (earlySetup.md §5.2): só LEITURA — comentários de uma review, ao expandir.
export const GET: RequestHandler = async ({ params, locals }) => {
	const valid = z.uuid().safeParse(params.id).success;
	return json(valid ? await getComments(params.id, locals.user?.id ?? null) : [], {
		headers: { 'cache-control': 'private, no-store' }
	});
};
