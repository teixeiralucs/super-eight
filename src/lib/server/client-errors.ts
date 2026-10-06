import { createHash } from 'node:crypto';
import { prisma } from '$lib/server/db';
import { errorKey, isNoise, type ClientErrorReport } from '$lib/errors/client-error';

/**
 * Registro dos erros do navegador (earlySetup.md §6.4.7). O mesmo erro só incrementa o
 * contador; erros novos param de entrar se já houver muitos (proteção contra abuso).
 */
const MAX_DISTINCT = 500;
const KEEP_DAYS = 30;

export async function recordClientError(report: ClientErrorReport, userAgent: string | null) {
	if (isNoise(report)) return;
	const signature = createHash('sha256').update(errorKey(report)).digest('hex');
	const now = new Date();
	const latest = {
		url: report.url,
		route: report.route ?? null,
		stack: report.stack ?? null,
		userAgent: userAgent?.slice(0, 300) ?? null,
		lastSeen: now
	};
	const { count } = await prisma.clientError.updateMany({
		where: { signature },
		data: { ...latest, count: { increment: 1 } }
	});
	if (count) return;
	if ((await prisma.clientError.count()) >= MAX_DISTINCT) return;
	await prisma.clientError
		.create({
			data: { signature, message: report.message, source: report.source, ...latest }
		})
		// Dois envios iguais ao mesmo tempo: o segundo perde a corrida do `unique`; tudo bem.
		.catch(() => null);
}

/** Rotina diária: erros sem ocorrência há 30 dias saem da lista. */
export async function pruneClientErrors() {
	const { count } = await prisma.clientError.deleteMany({
		where: { lastSeen: { lt: new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000) } }
	});
	return count;
}
