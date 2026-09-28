/**
 * Normaliza o destino pós-login vindo de `?next=`.
 * Só aceita caminhos internos (`/algo`), bloqueando open redirects como `//evil.com`.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/dashboard') {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
		return fallback;
	}
	return next;
}
