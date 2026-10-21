<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { cubicIn, quintOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { sheetDrag } from '$lib/motion/sheet-drag';
	import XIcon from '@lucide/svelte/icons/x';
	import { isConfirmOpen } from '$lib/feedback/confirm.svelte';

	/**
	 * Pop-up ao lado de um botão (desktop: à esquerda dele, centralizado na vertical sem sair
	 * da tela; celular: painel inferior que sobe da borda, escurece o fundo e fecha arrastando
	 * para baixo — §6.4.8). Fica por cima do painel de detalhes do filme: Esc e clique fora
	 * fecham só ele.
	 */
	let {
		anchor,
		label,
		heading,
		closeLabel,
		onClose,
		children
	}: {
		anchor: HTMLElement;
		/** Nome acessível do diálogo. */
		label: string;
		/** Título curto no topo. */
		heading: string;
		closeLabel: string;
		onClose: () => void;
		children: Snippet;
	} = $props();

	let panel: HTMLElement | undefined = $state();
	let position = $state<{ top: number; right: number } | null>(null);

	const GAP = 16;

	function place() {
		if (!panel || !matchMedia('(min-width: 1024px)').matches) {
			position = null;
			return;
		}
		const rect = anchor.getBoundingClientRect();
		const height = panel.offsetHeight;
		const centered = rect.top + rect.height / 2 - height / 2;
		position = {
			top: Math.min(Math.max(centered, GAP), window.innerHeight - height - GAP),
			right: window.innerWidth - rect.left + GAP
		};
	}

	$effect(() => {
		if (!panel) return;
		const observer = new ResizeObserver(place);
		observer.observe(panel);
		panel.querySelector<HTMLElement>('[data-autofocus]')?.focus();
		return () => observer.disconnect();
	});

	const isDesktop = () => matchMedia('(min-width: 1024px)').matches;

	/** Celular: sobe da borda (entrada com desaceleração longa, saída rápida). Desktop: desliza de lado. */
	function sheet(
		node: HTMLElement,
		_params: unknown,
		{ direction }: { direction: 'in' | 'out' | 'both' }
	) {
		const reduced = prefersReducedMotion.current;
		// Fechado arrastando: o próprio gesto já levou o painel para fora.
		if (reduced || node.dataset.dismissed !== undefined) return { duration: 0 };
		if (isDesktop()) {
			return {
				duration: 200,
				css: (t: number) => `opacity: ${t}; transform: translateX(${(1 - t) * 12}px)`
			};
		}
		return direction === 'out'
			? {
					duration: 220,
					easing: cubicIn,
					css: (t: number) => `transform: translateY(${(1 - t) * 100}%)`
				}
			: {
					duration: 460,
					easing: quintOut,
					css: (t: number) => `transform: translateY(${(1 - t) * 100}%)`
				};
	}

	function onPointerDown(event: PointerEvent) {
		if (isConfirmOpen()) return;
		const target = event.target as Node;
		if (!panel?.contains(target) && !anchor.contains(target)) onClose();
	}
</script>

<svelte:window
	onresize={place}
	onpointerdown={onPointerDown}
	onkeydown={(event) => event.key === 'Escape' && !isConfirmOpen() && onClose()}
/>

<!-- Celular: fundo escurecido atrás do painel (tocar nele fecha, via clique fora) -->
<div
	class="fixed inset-0 z-[69] bg-black/50 lg:hidden"
	aria-hidden="true"
	transition:fade={{ duration: prefersReducedMotion.current ? 0 : 200 }}
></div>

<!-- data-nested-dialog: o painel de detalhes por baixo ignora o Esc enquanto este estiver aberto -->
<div
	bind:this={panel}
	use:sheetDrag={onClose}
	data-nested-dialog
	role="dialog"
	aria-label={label}
	class={[
		'fixed z-[70] flex max-h-[min(640px,calc(100svh-2rem))] flex-col overflow-hidden border border-white/10 bg-background/95 shadow-2xl shadow-black/60',
		'inset-x-0 bottom-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-auto lg:w-[380px] lg:rounded-3xl lg:pb-0',
		!position && 'lg:invisible'
	]}
	style:top={position ? `${position.top}px` : undefined}
	style:right={position ? `${position.right}px` : undefined}
	transition:sheet
>
	<!-- Celular: alça para arrastar (o cabeçalho inteiro também arrasta) -->
	<div data-sheet-handle class="flex touch-none justify-center pt-3 lg:hidden" aria-hidden="true">
		<span class="h-1.5 w-10 rounded-full bg-white/25"></span>
	</div>
	<header
		data-sheet-handle
		class="flex touch-none items-center justify-between px-6 pt-2 lg:touch-auto lg:pt-5"
	>
		<h2 class="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">{heading}</h2>
		<button
			type="button"
			onclick={onClose}
			class="-mr-2 grid size-8 place-items-center rounded-full text-white/60 transition hover:text-white"
			aria-label={closeLabel}
		>
			<XIcon class="size-4" />
		</button>
	</header>
	{@render children()}
</div>
