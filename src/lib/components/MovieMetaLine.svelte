<script lang="ts">
	import { movieMetaText, type MovieMeta } from '$lib/format';

	/**
	 * "Diretor · País ········ Duração".
	 * Duração fica fixa à direita (como o ano na linha de cima) e o país nunca corta;
	 * só o nome da direção encolhe com reticências. O texto completo fica no `title`.
	 */
	let {
		meta,
		class: className = '',
		directorClass = 'text-white/85'
	}: { meta: MovieMeta; class?: string; directorClass?: string } = $props();

	const hasLeft = $derived(Boolean(meta.director || meta.country));
</script>

{#if hasLeft || meta.runtime}
	<p class={['flex items-baseline gap-2', className]} title={movieMetaText(meta)}>
		{#if hasLeft}
			<span class="flex min-w-0 items-baseline">
				{#if meta.director}<span class={['truncate', directorClass]}>{meta.director}</span>{/if}
				{#if meta.director && meta.country}<span
						class="mx-1.5 shrink-0 text-white/25"
						aria-hidden="true">·</span
					><span class="sr-only">,</span>{/if}
				{#if meta.country}<span class="shrink-0">{meta.country}</span>{/if}
			</span>
		{/if}
		{#if meta.runtime}
			{#if hasLeft}<span class="sr-only">,</span>{/if}
			<span class="ml-auto shrink-0 tabular-nums">{meta.runtime}</span>
		{/if}
	</p>
{/if}
