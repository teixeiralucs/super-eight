<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import XIcon from '@lucide/svelte/icons/x';
	import { isConfirmOpen } from '$lib/feedback/confirm.svelte';

	/**
	 * Pop-up ao lado de um botão (desktop: à esquerda dele, centralizado na vertical sem sair
	 * da tela; celular: painel inferior). Fica por cima do painel de detalhes do filme:
	 * Esc e clique fora fecham só ele.
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

<!-- data-nested-dialog: o painel de detalhes por baixo ignora o Esc enquanto este estiver aberto -->
<div
	bind:this={panel}
	data-nested-dialog
	role="dialog"
	aria-label={label}
	class={[
		'fixed z-[70] flex max-h-[min(640px,calc(100svh-2rem))] flex-col overflow-hidden border border-white/10 bg-background/95 shadow-2xl shadow-black/60',
		'inset-x-0 bottom-0 rounded-t-3xl lg:inset-x-auto lg:bottom-auto lg:w-[380px] lg:rounded-3xl',
		!position && 'lg:invisible'
	]}
	style:top={position ? `${position.top}px` : undefined}
	style:right={position ? `${position.right}px` : undefined}
	transition:fly={{ x: prefersReducedMotion.current ? 0 : 12, duration: 200 }}
>
	<header class="flex items-center justify-between px-6 pt-5">
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
