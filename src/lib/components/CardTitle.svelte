<script lang="ts">
	import MovieLogo from '$lib/components/movie/MovieLogo.svelte';

	/**
	 * Título dos cards (§6.5). Sem logo: o original em destaque e, embaixo, a tradução no
	 * idioma de quem vê. Com logo: a logo no lugar do original e, embaixo, o título em texto
	 * no idioma de quem vê (a logo pode estar em outro idioma). A segunda linha existe sempre
	 * (vazia quando igual ao original) para os cards da grade ficarem alinhados.
	 */
	let {
		title,
		originalTitle,
		year,
		logoPath = null
	}: {
		title: string;
		originalTitle: string;
		year: number | null;
		logoPath?: string | null;
	} = $props();

	const translated = $derived(title && title !== originalTitle ? title : null);
</script>

<div class="mt-2.5">
	{#if logoPath}
		<div class="flex items-end justify-between gap-2">
			<span class="sr-only">{originalTitle}</span>
			<MovieLogo
				path={logoPath}
				loading="lazy"
				class="h-9 w-auto max-w-[80%] min-w-0 object-contain object-left-bottom"
			/>
			<p class="shrink-0 text-xs text-muted-foreground tabular-nums">{year ?? '—'}</p>
		</div>
		<p class="mt-1 min-h-4 truncate text-xs text-white/50" title={title || originalTitle}>
			{title || originalTitle}
		</p>
	{:else}
		<div class="flex items-baseline justify-between gap-2">
			<p class="truncate text-sm font-medium" title={originalTitle}>{originalTitle}</p>
			<p class="shrink-0 text-xs text-muted-foreground tabular-nums">{year ?? '—'}</p>
		</div>
		<p class="min-h-4 truncate text-xs text-white/50" title={translated ?? undefined}>
			{translated ?? ''}
		</p>
	{/if}
</div>
