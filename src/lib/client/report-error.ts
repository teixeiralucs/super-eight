import { page } from '$app/state';
import type { ClientErrorReport } from '$lib/errors/client-error';

/**
 * Manda ao servidor um erro visto no navegador (earlySetup.md §6.4.7). Cada erro vai uma vez
 * por visita e no máximo 10 por visita; falhar no envio não faz nada (nunca piora a tela).
 */
const sent = new Set<string>();
const MAX_PER_VISIT = 10;

export function reportClientError(error: unknown, source: ClientErrorReport['source']) {
	if (typeof window === 'undefined') return;
	const err = error instanceof Error ? error : new Error(String(error));
	const message = err.message || String(error);
	if (sent.has(message) || sent.size >= MAX_PER_VISIT) return;
	sent.add(message);

	let route: string | null = null;
	try {
		route = page.route.id;
	} catch {
		// Fora de um componente/antes da hidratação: sem rota.
	}
	const report: ClientErrorReport = {
		message: message.slice(0, 1000),
		stack: err.stack?.slice(0, 4000),
		url: `${location.pathname}${location.search}`.slice(0, 500),
		route,
		source
	};
	fetch('/api/client-errors', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(report),
		keepalive: true
	}).catch(() => {});
}
