<script lang="ts">
	const features = [
		{
			title: 'Biblioteca',
			text: 'Sua coleção em grade: o que você viu, o que quer ver, suas notas de 1 a 10 e seus favoritos.',
			color: 'text-neon-pink'
		},
		{
			title: 'Diário',
			text: 'Cada sessão com data, nota e anotações. Reviu? O diário guarda todas as vezes.',
			color: 'text-neon-cyan'
		},
		{
			title: 'Listas',
			text: 'Coleções temáticas do seu jeito — privadas ou públicas, na ordem que você quiser.',
			color: 'text-neon-purple'
		},
		{
			title: 'Comunidade',
			text: 'Siga amigos, leia reviews, curta listas e veja o que a sua gente anda assistindo.',
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
			Feito para quem vive
			<span class="text-white/35">de cinema.</span>
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
