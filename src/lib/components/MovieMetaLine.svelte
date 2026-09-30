<script lang="ts">
	import { movieMetaText, type MovieMeta } from '$lib/format';

	// "Diretor · País · Duração": diretor em destaque, separadores em ponto médio apagado.
	let {
		meta,
		class: className = '',
		directorClass = 'text-white/85'
	}: { meta: MovieMeta; class?: string; directorClass?: string } = $props();

	const parts = $derived(
		[
			meta.director && { text: meta.director, className: directorClass },
			meta.country && { text: meta.country, className: '' },
			meta.runtime && { text: meta.runtime, className: 'tabular-nums' }
		].filter((part) => !!part)
	);
</script>

{#if parts.length}
	<p class={['truncate', className]} title={movieMetaText(meta)}>
		{#each parts as part, i (part.text)}
			{#if i > 0}<span class="mx-1.5 text-white/25" aria-hidden="true">·</span><span class="sr-only"
					>,</span
				>{/if}<span class={part.className}>{part.text}</span>
		{/each}
	</p>
{/if}
