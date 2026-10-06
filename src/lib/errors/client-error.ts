import { z } from 'zod';

// Erros do navegador enviados ao servidor (earlySetup.md §6.4.7): formato e assinatura.

export const CLIENT_ERROR_SOURCES = ['boundary', 'window', 'rejection', 'navigation'] as const;

export const clientErrorSchema = z.object({
	message: z.string().trim().min(1).max(1000),
	stack: z.string().max(4000).optional(),
	url: z.string().max(500),
	route: z.string().max(200).nullable().optional(),
	source: z.enum(CLIENT_ERROR_SOURCES)
});

export type ClientErrorReport = z.infer<typeof clientErrorSchema>;

/** Ruído que não é do app: extensões, avisos do navegador, erros de outra origem, Vite. */
export function isNoise(report: Pick<ClientErrorReport, 'message' | 'stack'>) {
	const text = `${report.message}\n${report.stack ?? ''}`;
	return (
		/(chrome|moz|safari(-web)?)-extension:\/\//.test(text) ||
		/^Script error\.?$/.test(report.message) ||
		/ResizeObserver loop/.test(report.message) ||
		/\[vite\]|Failed to fetch dynamically imported module/.test(text)
	);
}

/**
 * Agrupa ocorrências do mesmo erro: números, IDs e hashes de arquivo viram `#`, e da pilha só
 * conta a primeira linha que aponta para código (sem linha/coluna, que mudam a cada deploy).
 */
export function errorKey(report: Pick<ClientErrorReport, 'message' | 'stack' | 'route'>) {
	const normalize = (text: string) =>
		text
			.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '#')
			.replace(/\b[0-9a-z_-]*\d[0-9a-z_-]*\b/gi, '#')
			.replace(/\s+/g, ' ')
			.trim();
	const frame =
		report.stack
			?.split('\n')
			.map((line) => line.trim())
			.find((line) => line.startsWith('at ') || line.includes('@'))
			?.replace(/:\d+:\d+\)?$/, '') ?? '';
	return [normalize(report.message), normalize(frame), report.route ?? ''].join('|');
}
