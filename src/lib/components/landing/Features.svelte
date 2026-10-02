<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	const features = [
		{
			title: m.nav_library(),
			text: m.feature_library_text(),
			color: 'text-neon-pink'
		},
		{
			title: m.nav_diary(),
			text: m.feature_diary_text(),
			color: 'text-neon-cyan'
		},
		{
			title: m.nav_lists(),
			text: m.feature_lists_text(),
			color: 'text-neon-purple'
		},
		{
			title: m.nav_community(),
			text: m.feature_community_text(),
			color: 'text-neon-peach'
		}
	];
</script>

<section id="recursos" class="scroll-mt-24 py-16 md:py-28" aria-labelledby="recursos-title">
	<div class="mx-auto max-w-[1600px] px-5 md:px-10">
		<p class="mb-3 font-mono text-xs tracking-widest text-muted-foreground">03.</p>
		<h2
			id="recursos-title"
			class="max-w-4xl font-display text-4xl leading-[0.95] font-bold tracking-[-0.03em] uppercase md:text-6xl"
		>
			{m.features_title()}
			<span class="text-white/35">{m.features_title_dim()}</span>
		</h2>

		<ol class="mt-14 grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
			{#each features as feature, i (feature.title)}
				<li
					class="group border-b border-white/10 py-8 sm:odd:pr-8 sm:even:border-l sm:even:pl-8 lg:border-b-0 lg:border-l lg:px-8 lg:first:border-l-0 lg:first:pl-0"
				>
					<span class="font-mono text-xs text-muted-foreground">0{i + 1}</span>
					<h3 class="mt-8 font-display text-2xl font-semibold">
						{feature.title}<span class={feature.color}>.</span>
					</h3>
					<p class="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
				</li>
			{/each}
		</ol>
	</div>
</section>
