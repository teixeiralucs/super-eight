<script lang="ts">
	import type { Snippet } from 'svelte';

	// Cartão de métrica: número grande (estilo "85%" das referências) + legenda.
	let {
		label,
		value,
		unit,
		caption,
		accent,
		children
	}: {
		label: string;
		value: string;
		unit?: string;
		caption?: string;
		/** Classe de cor do ponto indicador (ex.: 'bg-neon-pink'). */
		accent: string;
		children?: Snippet;
	} = $props();
</script>

<div class="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6">
	<p class="flex items-center gap-2 text-xs tracking-wider text-muted-foreground uppercase">
		<span class={['size-1.5 rounded-full', accent]} aria-hidden="true"></span>
		{label}
	</p>
	<p
		class="mt-6 font-display text-6xl leading-none font-semibold tracking-[-0.05em] tabular-nums md:text-7xl"
	>
		{value}{#if unit}<span class="ml-1 text-2xl font-normal tracking-normal text-white/40"
				>{unit}</span
			>{/if}
	</p>
	{#if children}
		<div class="mt-5">{@render children()}</div>
	{/if}
	{#if caption}
		<p class="mt-auto pt-4 text-sm text-muted-foreground">{caption}</p>
	{/if}
</div>
