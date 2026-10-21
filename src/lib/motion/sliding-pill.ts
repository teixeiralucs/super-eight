import type { Action } from 'svelte/action';

/**
 * Pílula que desliza até o item ativo (abas, filtros, navegação) — inspirada no indicador
 * `layoutId` da beUI, feita com CSS (earlySetup.md §6.4.8). O item ativo é o que tem
 * `aria-current="page"`, `aria-selected="true"` ou `aria-pressed="true"`.
 *
 * Sem JavaScript (ou antes de hidratar) o item ativo mantém o próprio fundo; com a pílula
 * pronta, o contêiner ganha `data-pill-ready` e o CSS global (layout.css) tira esse fundo.
 * Ao clicar, a pílula já vai para o item clicado (`data-pill-target`) sem esperar a página
 * carregar. O contêiner precisa de `position: relative` (ex.: classe `relative`).
 */
const ACTIVE = '[aria-current="page"], [aria-selected="true"], [aria-pressed="true"]';
/** Se a navegação do clique não acontecer, a pílula volta ao ativo depois disto. */
const SETTLE_MS = 4000;

export const slidingPill: Action<HTMLElement, string> = (node, pillClass) => {
	const pill = document.createElement('span');
	pill.setAttribute('aria-hidden', 'true');
	node.prepend(pill);
	node.dataset.pillReady = '';

	function setClass(value: string) {
		pill.className = `pill-indicator ${value}`;
		// Pílula clara: o texto do item sobre ela fica escuro (regras em layout.css).
		if (/(^|\s)bg-white(\s|$)/.test(value)) node.dataset.pillLight = '';
		else delete node.dataset.pillLight;
	}
	setClass(pillClass);

	let placed = false;
	let frame = 0;
	let settle: ReturnType<typeof setTimeout> | undefined;
	/** Item clicado enquanto a página ainda não marcou o novo ativo. */
	let pending: HTMLElement | null = null;

	function setPending(item: HTMLElement | null) {
		pending?.removeAttribute('data-pill-target');
		pending = item;
		if (item) {
			item.dataset.pillTarget = '';
			node.dataset.pillPending = '';
		} else {
			delete node.dataset.pillPending;
		}
	}

	function place() {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			const current = node.querySelector<HTMLElement>(ACTIVE);
			// O ativo de verdade chegou ao clicado (ou o clicado sumiu): fim da espera.
			if (pending && (current === pending || !node.contains(pending))) setPending(null);
			const active = pending ?? current;
			const box = node.getBoundingClientRect();
			const rect = active?.getBoundingClientRect();
			if (!active || !rect || !rect.width || !box.width) {
				pill.style.opacity = '0';
				placed = false;
				return;
			}
			const x = rect.left - box.left + node.scrollLeft;
			const y = rect.top - box.top + node.scrollTop;
			// Primeira posição (ou voltando de invisível): sem animar a partir do canto.
			if (!placed) pill.style.transition = 'none';
			pill.style.transform = `translate(${x}px, ${y}px)`;
			pill.style.width = `${rect.width}px`;
			pill.style.height = `${rect.height}px`;
			pill.style.opacity = '1';
			if (!placed) {
				void pill.offsetWidth;
				pill.style.transition = '';
				placed = true;
			}
		});
	}

	function onClick(event: MouseEvent) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		const item = (event.target as HTMLElement).closest<HTMLElement>('a[href], button');
		if (!item || !node.contains(item) || item.matches(':disabled, [aria-current="page"]')) {
			return;
		}
		setPending(item);
		place();
		clearTimeout(settle);
		settle = setTimeout(() => {
			setPending(null);
			place();
		}, SETTLE_MS);
	}
	node.addEventListener('click', onClick);

	// O ativo muda por atributo (Svelte atualiza aria-*), itens entram/saem, o tamanho muda.
	const mutations = new MutationObserver(place);
	mutations.observe(node, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ['aria-current', 'aria-selected', 'aria-pressed']
	});
	const resize = new ResizeObserver(place);
	resize.observe(node);
	for (const child of node.children) if (child !== pill) resize.observe(child);
	window.addEventListener('resize', place);
	document.fonts?.ready.then(place);
	place();

	return {
		update: setClass,
		destroy() {
			cancelAnimationFrame(frame);
			clearTimeout(settle);
			setPending(null);
			node.removeEventListener('click', onClick);
			mutations.disconnect();
			resize.disconnect();
			window.removeEventListener('resize', place);
			pill.remove();
			delete node.dataset.pillReady;
			delete node.dataset.pillLight;
		}
	};
};
