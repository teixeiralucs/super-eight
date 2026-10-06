import { json } from '@sveltejs/kit';
import { clientErrorSchema } from '$lib/errors/client-error';
import { recordClientError } from '$lib/server/client-errors';
import type { RequestHandler } from './$types';

/** Erros capturados no navegador (§6.4.7). Só da própria origem; corpo pequeno; resposta vazia. */
export const POST: RequestHandler = async ({ request, url }) => {
	if (request.headers.get('origin') !== url.origin) return json(null, { status: 403 });
	if (Number(request.headers.get('content-length') ?? 0) > 8_000)
		return json(null, { status: 413 });
	const parsed = clientErrorSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return json(null, { status: 400 });
	await recordClientError(parsed.data, request.headers.get('user-agent'));
	return new Response(null, { status: 204 });
};
