import { timingSafeEqual } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runDailyMaintenance } from '$lib/server/maintenance';
import type { Config } from '@sveltejs/adapter-vercel';
import type { RequestHandler } from './$types';

// Exceção permitida (earlySetup.md §4.4.3): endpoint do Vercel Cron (vercel.json), uma vez
// por dia. A Vercel manda `Authorization: Bearer ${CRON_SECRET}`; sem o segredo configurado,
// o endpoint fica fechado.

/** Limite da função na Vercel (plano Hobby: até 300 s). */
export const config: Config = { maxDuration: 300 };
/** Folga para responder antes do limite. */
const BUDGET_MS = 240_000;

function authorized(header: string | null) {
	const secret = env.CRON_SECRET;
	if (!secret || !header) return false;
	const expected = Buffer.from(`Bearer ${secret}`);
	const received = Buffer.from(header);
	return expected.length === received.length && timingSafeEqual(expected, received);
}

export const GET: RequestHandler = async ({ request, fetch }) => {
	if (!authorized(request.headers.get('authorization'))) error(401, 'Unauthorized');
	const report = await runDailyMaintenance(BUDGET_MS, fetch);
	console.log('[cron] rotina diária:', JSON.stringify(report));
	return json(report);
};
