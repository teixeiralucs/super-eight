<script lang="ts">
	/**
	 * Título dos cards (§6.5): o original em destaque e, embaixo, a tradução no idioma de
	 * quem vê. A linha da tradução existe sempre (vazia quando igual ao original) para os
	 * cards da grade ficarem alinhados.
	 */
	let {
		title,
		originalTitle,
		year
	}: { title: string; originalTitle: string; year: number | null } = $props();

	const translated = $derived(title && title !== originalTitle ? title : null);
</script>

<div class="mt-2.5">
	<div class="flex items-baseline justify-between gap-2">
		<p class="truncate text-sm font-medium" title={originalTitle}>{originalTitle}</p>
		<p class="shrink-0 text-xs text-muted-foreground tabular-nums">{year ?? '—'}</p>
	</div>
	<p class="min-h-4 truncate text-xs text-white/50" title={translated ?? undefined}>
		{translated ?? ''}
	</p>
</div>
