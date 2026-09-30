import type { Attachment } from 'svelte/attachments';

/**
 * Chama `onVisible` quando o elemento (sentinela no fim da lista) se aproxima da tela.
 * `rootMargin` antecipa o carregamento para a rolagem não "bater" no fim.
 */
export function infiniteScroll(onVisible: () => void, rootMargin = '800px'): Attachment {
	return (element) => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) onVisible();
			},
			{ rootMargin }
		);
		observer.observe(element);
		return () => observer.disconnect();
	};
}
