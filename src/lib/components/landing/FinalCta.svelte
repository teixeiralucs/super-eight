<script lang="ts">
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/brand/Logo.svelte';
	import { backdropUrl } from '$lib/tmdb/images';

	let { backdropPath, signedIn }: { backdropPath: string | null; signedIn: boolean } = $props();
</script>

<section class="relative isolate overflow-hidden py-28 md:py-40">
	{#if backdropPath}
		<!-- w300 ampliado já dá o aspecto suave; evita filter: blur em tela cheia -->
		<img
			src={backdropUrl(backdropPath, 'w300')}
			alt=""
			loading="lazy"
			decoding="async"
			class="absolute inset-0 -z-10 size-full object-cover opacity-35"
		/>
	{/if}
	<div
		class="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/60 to-background"
	></div>

	<div class="mx-auto flex max-w-3xl flex-col items-center px-5 text-center">
		<Logo variant="stacked" class="w-64 md:w-80" />
		<h2 class="mt-10 font-display text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
			Sua próxima sessão
			<em class="font-serif font-normal tracking-normal text-white/60">começa aqui.</em>
		</h2>
		<a
			href={resolve(signedIn ? '/dashboard' : '/signup')}
			class="mt-10 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition hover:shadow-[0_0_32px_var(--neon-pink)]"
		>
			{signedIn ? 'Abrir minha biblioteca' : 'Criar conta grátis'}
		</a>
	</div>
</section>
