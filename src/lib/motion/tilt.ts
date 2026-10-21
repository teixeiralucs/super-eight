import type { Action } from 'svelte/action';

/**
 * Inclinação 3D com reflexo que segue o cursor (Tilt Card da beUI — earlySetup.md §6.4.8).
 * Mexe só em variáveis CSS no elemento; quem inclina são os filhos com `.tilt-surface` e o
 * brilho é o `.tilt-glare` (estilos em layout.css). Só com mouse e sem "reduzir movimento".
 */
const MAX_DEG = 9;

export const tilt: Action<HTMLElement> = (node) => {
	const canTilt =
		matchMedia('(hover: hover) and (pointer: fine)').matches &&
		!matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!canTilt) return;

	let frame = 0;

	function onMove(event: PointerEvent) {
		const surface = node.querySelector<HTMLElement>('.tilt-surface');
		if (!surface) return;
		const rect = surface.getBoundingClientRect();
		const px = (event.clientX - rect.left) / rect.width;
		const py = (event.clientY - rect.top) / rect.height;
		// Fora do pôster (ex.: no título abaixo dele): volta ao normal.
		if (px < 0 || px > 1 || py < 0 || py > 1) return reset();
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			node.dataset.tilting = '';
			node.style.setProperty('--tilt-rx', `${((0.5 - py) * 2 * MAX_DEG).toFixed(2)}deg`);
			node.style.setProperty('--tilt-ry', `${((px - 0.5) * 2 * MAX_DEG).toFixed(2)}deg`);
			node.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
			node.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
		});
	}

	function reset() {
		cancelAnimationFrame(frame);
		delete node.dataset.tilting;
		for (const name of ['--tilt-rx', '--tilt-ry', '--glare-x', '--glare-y']) {
			node.style.removeProperty(name);
		}
	}

	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerleave', reset);
	return {
		destroy() {
			reset();
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerleave', reset);
		}
	};
};
