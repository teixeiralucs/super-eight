<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	// Gêneros mais assistidos. Série única (ciano); rótulos e valores em cor de texto.
	let { genres }: { genres: { genre: string; count: number }[] } = $props();

	const max = $derived(Math.max(1, ...genres.map((g) => g.count)));
</script>

<section
	aria-labelledby="generos"
	class="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6"
>
	<h2 id="generos" class="font-display text-lg font-semibold">{m.genres_title()}</h2>
	<p class="mt-1 text-sm text-muted-foreground">{m.genres_subtitle()}</p>

	{#if genres.length}
		<ol class="mt-6 flex flex-col gap-4">
			{#each genres as { genre, count }, i (genre)}
				<li class="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3 text-sm">
					<span class="font-mono text-xs text-muted-foreground">{i + 1}</span>
					<div>
						<p class="mb-1.5">{genre}</p>
						<div class="h-1.5 rounded-full bg-white/[0.06]">
							<div
								class="h-full rounded-full bg-neon-cyan"
								style:width={`${(count / max) * 100}%`}
							></div>
						</div>
					</div>
					<span class="self-end text-muted-foreground tabular-nums"
						>{count} <span class="sr-only">{m.movies_word()}</span></span
					>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="mt-6 text-sm text-muted-foreground">{m.genres_empty()}</p>
	{/if}
</section>
