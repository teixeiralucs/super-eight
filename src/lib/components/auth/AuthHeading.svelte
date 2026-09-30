<script lang="ts">
	import type { Snippet } from 'svelte';

	// Cabeçalho das telas de auth: marcador "01 / Entrar", título com ponto rosa e apoio.
	let {
		step,
		label,
		title,
		children
	}: { step: string; label: string; title: string; children?: Snippet } = $props();
</script>

<p class="text-xs text-white/40">
	<span class="font-mono tabular-nums">{step}</span>
	<span class="mx-1.5" aria-hidden="true">/</span>{label}
</p>
<h1
	class="mt-4 font-display text-[clamp(2.25rem,4vw,3.25rem)] leading-[0.95] font-semibold tracking-[-0.04em]"
>
	{title}<span class="text-neon-pink">.</span>
</h1>
{#if children}
	<p class="mt-4 text-sm text-white/60">{@render children()}</p>
{/if}
