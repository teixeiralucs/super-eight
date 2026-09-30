import type { Attachment } from 'svelte/attachments';

/**
 * Informa se o elemento está de fato visível: na tela (IntersectionObserver) e com a aba
 * em primeiro plano. Usado para pausar carrosséis automáticos que redesenham imagens em
 * tela cheia — sem isso eles consomem CPU/GPU mesmo fora da tela ou em outra aba.
 */
export function trackVisibility(onChange: (visible: boolean) => void): Attachment {
	return (element) => {
		let intersecting = true;
		const update = () => onChange(intersecting && document.visibilityState === 'visible');

		const observer = new IntersectionObserver((entries) => {
			intersecting = entries.some((entry) => entry.isIntersecting);
			update();
		});
		observer.observe(element);
		document.addEventListener('visibilitychange', update);

		return () => {
			observer.disconnect();
			document.removeEventListener('visibilitychange', update);
		};
	};
}
