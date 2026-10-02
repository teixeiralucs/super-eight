<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import XIcon from '@lucide/svelte/icons/x';
	import { m } from '$lib/paraglide/messages';

	/** Janela modal centralizada: Esc e clique fora fecham. */
	let { title, onClose, children }: { title: string; onClose: () => void; children: Snippet } =
		$props();

	const id = $props.id();
	let panel: HTMLElement | undefined = $state();

	$effect(() => {
		const previous = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		panel?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
		return () => {
			document.documentElement.style.overflow = previous;
		};
	});
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onClose()} />

<!-- data-nested-dialog: o painel de detalhes do filme ignora o Esc enquanto este estiver aberto -->
<div
	data-nested-dialog
	class="fixed inset-0 z-[80] grid place-items-end bg-background/80 sm:place-items-center sm:p-6"
	transition:fade={{ duration: 150 }}
	onclick={(event) => event.target === event.currentTarget && onClose()}
	onkeydown={() => {}}
	role="presentation"
>
	<div
		bind:this={panel}
		role="dialog"
		aria-modal="true"
		aria-labelledby="{id}-title"
		class="max-h-[90svh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/60 sm:max-w-lg sm:rounded-3xl md:p-8"
		transition:fly={{ y: prefersReducedMotion.current ? 0 : 16, duration: 200 }}
	>
		<header class="mb-6 flex items-start justify-between gap-4">
			<h2 id="{id}-title" class="font-display text-2xl font-semibold tracking-[-0.02em]">
				{title}
			</h2>
			<button
				type="button"
				onclick={onClose}
				class="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-white/60 transition hover:text-white"
				aria-label={m.list_cancel()}
			>
				<XIcon class="size-4" />
			</button>
		</header>
		{@render children()}
	</div>
</div>
