<script lang="ts">
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { backdropSrcset, backdropUrl } from '$lib/tmdb/images';

	/**
	 * Fundo em tela cheia nas cores originais, com vinhetas para leitura do texto.
	 * Fixo no tamanho da tela: não "dá zoom" quando o conteúdo da aba fica mais alto.
	 */
	let { path }: { path: string | null } = $props();
</script>

<div class="fixed inset-0 -z-10 overflow-hidden bg-background" aria-hidden="true">
	{#if path}
		{#key path}
			<!-- w300 ampliado já fica suave enquanto o w1280 carrega (sem filter: blur, que é caro) -->
			<div
				class="absolute inset-0"
				style:background-image="url({backdropUrl(path, 'w300')})"
				style:background-size="cover"
				style:background-position="center"
				transition:fade={{ duration: prefersReducedMotion.current ? 0 : 500 }}
			>
				<img
					src={backdropUrl(path, 'w1280')}
					srcset={backdropSrcset(path)}
					sizes="100vw"
					alt=""
					decoding="async"
					class="size-full object-cover"
				/>
			</div>
		{/key}
	{/if}
	<div
		class="absolute inset-0 bg-linear-to-r from-background/85 via-background/35 to-transparent"
	></div>
	<div
		class="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/50"
	></div>
</div>
