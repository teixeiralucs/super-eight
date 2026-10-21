import type { Action } from 'svelte/action';

/**
 * Arrastar para fechar um painel inferior (Bottom Sheet da beUI — earlySetup.md §6.4.8).
 * O gesto começa na alça/cabeçalho (`[data-sheet-handle]`, fora de botões); o painel segue o
 * dedo (para cima só um pouco, com resistência). Ao soltar: arrastou mais de 30% da altura
 * ou jogou rápido para baixo → desce e chama `onDismiss`; senão volta com mola.
 * Só no celular (abaixo de `lg`) e sem "reduzir movimento" o retorno é animado.
 */
const DISMISS_RATIO = 0.3;
/** px/ms: um "peteleco" para baixo fecha mesmo com pouco deslocamento. */
const FLICK_VELOCITY = 0.6;

export const sheetDrag: Action<HTMLElement, () => void> = (node, onDismiss) => {
	let dismiss = onDismiss;
	let startY = 0;
	let lastY = 0;
	let lastTime = 0;
	let velocity = 0;
	let dragging = false;

	const isSheet = () => !matchMedia('(min-width: 1024px)').matches;

	function onDown(event: PointerEvent) {
		const target = event.target as HTMLElement;
		if (!isSheet() || !target.closest('[data-sheet-handle]') || target.closest('button, a')) return;
		dragging = true;
		startY = lastY = event.clientY;
		lastTime = event.timeStamp;
		velocity = 0;
		node.style.transition = 'none';
		try {
			node.setPointerCapture(event.pointerId);
		} catch {
			// Sem captura (ponteiro já solto): o gesto segue pelos eventos do próprio painel.
		}
	}

	function onMove(event: PointerEvent) {
		if (!dragging) return;
		const dy = event.clientY - startY;
		const dt = event.timeStamp - lastTime;
		if (dt > 0) velocity = (event.clientY - lastY) / dt;
		lastY = event.clientY;
		lastTime = event.timeStamp;
		// Para baixo acompanha o dedo; para cima, resistência (não descola da borda).
		node.style.transform = `translateY(${dy > 0 ? dy : dy * 0.15}px)`;
	}

	function onUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
		const dy = event.clientY - startY;
		// Parou o dedo antes de soltar: não conta como peteleco.
		if (event.timeStamp - lastTime > 100) velocity = 0;
		const close = dy > node.offsetHeight * DISMISS_RATIO || (dy > 24 && velocity > FLICK_VELOCITY);
		if (close) {
			// Termina a descida daqui (a saída do Svelte é pulada: `data-dismissed`).
			node.dataset.dismissed = '';
			node.style.transition = 'transform 220ms cubic-bezier(0.4, 0, 1, 1)';
			node.style.transform = 'translateY(100%)';
			setTimeout(() => dismiss(), 200);
		} else {
			node.style.transition = 'transform 480ms var(--spring-easing)';
			node.style.transform = '';
		}
	}

	node.addEventListener('pointerdown', onDown);
	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerup', onUp);
	node.addEventListener('pointercancel', onUp);
	return {
		update(next) {
			dismiss = next;
		},
		destroy() {
			node.removeEventListener('pointerdown', onDown);
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerup', onUp);
			node.removeEventListener('pointercancel', onUp);
		}
	};
};
