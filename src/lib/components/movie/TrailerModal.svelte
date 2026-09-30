<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';
	import type { Trailer } from '$lib/tmdb/types';

	/** Player do trailer (YouTube sem cookies) sobre a tela; Esc ou clique fora fecha. */
	let { trailer, onClose }: { trailer: Trailer; onClose: () => void } = $props();

	let closeButton: HTMLButtonElement | undefined = $state();
	$effect(() => closeButton?.focus());
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onClose()} />

<!-- data-nested-dialog: o painel de detalhes por baixo ignora o Esc enquanto este estiver aberto -->
<div
	data-nested-dialog
	role="dialog"
	aria-modal="true"
	aria-label="Trailer: {trailer.name}"
	tabindex="-1"
	class="fixed inset-0 z-[80] grid place-items-center bg-background/90 p-4 md:p-10"
	onclick={(event) => event.target === event.currentTarget && onClose()}
	onkeydown={() => {}}
>
	<div class="relative w-full max-w-5xl">
		<button
			bind:this={closeButton}
			type="button"
			onclick={onClose}
			class="absolute -top-12 right-0 grid size-10 place-items-center rounded-full border border-white/15 transition hover:border-white/40"
			aria-label="Fechar trailer"
		>
			<XIcon class="size-4" />
		</button>
		<div class="aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
			<iframe
				src="https://www.youtube-nocookie.com/embed/{trailer.key}?autoplay=1&rel=0"
				title={trailer.name}
				allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
				allowfullscreen
				class="size-full"
			></iframe>
		</div>
	</div>
</div>
