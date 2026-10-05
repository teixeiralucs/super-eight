import { error } from '@sveltejs/kit';
import { buildBackup, buildCsvZip } from '$lib/server/export';
import type { RequestHandler } from './$types';

// Exceção permitida (earlySetup.md §6.9): download só de LEITURA dos dados do próprio usuário
// (a rota está sob /settings, protegida no hooks.server.ts).
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401);
	if (params.format !== 'json' && params.format !== 'csv') error(404);

	const backup = await buildBackup(locals.user.id);
	const stamp = backup.exportedAt.slice(0, 10);
	const name = `super-eight-${backup.profile.username}-${stamp}`;
	const headers = { 'cache-control': 'private, no-store' };

	if (params.format === 'json') {
		return new Response(JSON.stringify(backup, null, '\t'), {
			headers: {
				...headers,
				'content-type': 'application/json; charset=utf-8',
				'content-disposition': `attachment; filename="${name}.json"`
			}
		});
	}
	return new Response(buildCsvZip(backup), {
		headers: {
			...headers,
			'content-type': 'application/zip',
			'content-disposition': `attachment; filename="${name}.zip"`
		}
	});
};
