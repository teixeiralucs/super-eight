import type { HandleClientError } from '@sveltejs/kit';
import { reportClientError } from '$lib/client/report-error';

// Erros em `load`/navegação no navegador também são registrados (§6.4.7); 404 não é erro do app.
export const handleError: HandleClientError = ({ error, status }) => {
	if (status !== 404) reportClientError(error, 'navigation');
};
