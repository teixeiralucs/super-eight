<script lang="ts">
	import Features from '$lib/components/landing/Features.svelte';
	import FinalCta from '$lib/components/landing/FinalCta.svelte';
	import Hero from '$lib/components/landing/Hero.svelte';
	import NowPlayingFeature from '$lib/components/landing/NowPlayingFeature.svelte';
	import PosterRail from '$lib/components/landing/PosterRail.svelte';
	import SiteFooter from '$lib/components/landing/SiteFooter.svelte';
	import SiteHeader from '$lib/components/landing/SiteHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const signedIn = $derived(Boolean(data.user));
	const [nowPlayingHighlight, ...nowPlayingRest] = $derived(data.nowPlaying);
</script>

<svelte:head>
	<title>Super Eight — seu diário de cinema</title>
	<meta
		name="description"
		content="Registre, avalie e organize os filmes que você assiste. Biblioteca, diário, listas e comunidade num só lugar."
	/>
</svelte:head>

<SiteHeader user={data.user} />

<main>
	{#if data.featured.length}
		<Hero movies={data.featured} {signedIn} />
	{/if}

	{#if data.popular.length}
		<PosterRail
			id="em-alta"
			number="01."
			title="Em alta"
			subtitle="esta semana"
			movies={data.popular}
			ranked
		/>
	{/if}

	{#if nowPlayingHighlight}
		<NowPlayingFeature movie={nowPlayingHighlight} />
		{#if nowPlayingRest.length}
			<PosterRail
				id="mais-em-cartaz"
				number="02.1"
				title="Também"
				subtitle="em cartaz"
				movies={nowPlayingRest}
			/>
		{/if}
	{/if}

	<Features />

	<FinalCta backdropPath={data.featured[1]?.backdropPath ?? null} {signedIn} />
</main>

<SiteFooter />
