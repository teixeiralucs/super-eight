<script lang="ts">
	import { resolve } from '$app/paths';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Logo from '$lib/components/brand/Logo.svelte';
</script>

<section
	class="relative isolate overflow-hidden rounded-3xl border border-white/10 px-6 py-20 text-center md:py-28"
>
	<div
		class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--neon-purple)_18%,transparent),transparent_60%)]"
	></div>
	<Logo variant="stacked" class="mx-auto w-52 opacity-90" />
	<h2 class="mt-10 font-display text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
		Sua biblioteca está
		<em class="font-serif font-normal tracking-normal text-white/60">vazia.</em>
	</h2>
	<p class="mx-auto mt-4 max-w-md text-muted-foreground">
		Busque um filme que você viu (ou quer ver) e comece sua coleção. Suas métricas aparecem aqui
		conforme você registra sessões.
	</p>
	<a
		href={resolve('/search')}
		class="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground"
	>
		<SearchIcon class="size-4" aria-hidden="true" /> Buscar filmes
	</a>
</section>
