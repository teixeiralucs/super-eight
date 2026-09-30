<script lang="ts">
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { backdropSrcset, backdropUrl } from '$lib/tmdb/images';

	/**
	 * Fundo em tela cheia com duotone da cor do filme (referência "Joker"):
	 * imagem em tons de cinza + camada da cor em `mix-blend-mode: color`.
	 */
	let { path, tint }: { path: string | null; tint: string } = $props();
</script>

<div class="absolute inset-0 -z-10 overflow-hidden bg-background" aria-hidden="true">
	{#if path}
		{#key path}
			<div
				class="absolute inset-0"
				transition:fade={{ duration: prefersReducedMotion.current ? 0 : 800 }}
			>
				<img
					src={backdropUrl(path, 'w300')}
					alt=""
					class="absolute inset-0 size-full scale-110 object-cover blur-2xl grayscale"
				/>
				<img
					src={backdropUrl(path, 'w1280')}
					srcset={backdropSrcset(path)}
					sizes="100vw"
					alt=""
					class="absolute inset-0 size-full object-cover brightness-110 contrast-110 grayscale"
				/>
			</div>
		{/key}
	{/if}
	<!-- A cor do filme recolore a imagem inteira -->
	<div
		class="absolute inset-0 mix-blend-color transition-colors duration-700"
		style:background-color={tint}
	></div>
	<div
		class="absolute inset-0 opacity-20 mix-blend-multiply transition-colors duration-700"
		style:background-color={tint}
	></div>
	<!-- Vinhetas de leitura -->
	<div
		class="absolute inset-0 bg-linear-to-r from-background/75 via-background/20 to-transparent"
	></div>
	<div
		class="absolute inset-0 bg-linear-to-t from-background/95 via-transparent to-background/40"
	></div>
</div>
