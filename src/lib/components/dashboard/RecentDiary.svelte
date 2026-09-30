<script lang="ts">
	import { openMovie } from '$lib/movie/open.svelte';
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { formatShortDate } from '$lib/format';
	import type { DiarySession } from '$lib/library/types';
	import { posterUrl } from '$lib/tmdb/images';
	import RatingBadge from './RatingBadge.svelte';

	let { sessions }: { sessions: DiarySession[] } = $props();
</script>

<section
	aria-labelledby="diario-recente"
	class="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
>
	<div class="flex items-center justify-between">
		<h2 id="diario-recente" class="font-display text-lg font-semibold">Diário recente</h2>
		<a
			href={resolve('/diary')}
			class="inline-flex items-center gap-1 text-xs text-white/60 transition hover:text-white"
		>
			Ver tudo <ArrowRightIcon class="size-3.5" aria-hidden="true" />
		</a>
	</div>

	<ol class="mt-5 flex flex-1 flex-col gap-1">
		{#each sessions as session (session.id)}
			<li>
				<a
					href={resolve('/movie/[id]', { id: String(session.movie.id) })}
					onclick={(event) => openMovie(event, session.movie.id)}
					class="flex items-center gap-4 rounded-xl p-2 transition hover:bg-white/5"
				>
					<img
						src={posterUrl(session.movie.posterPath, 'w185')}
						alt=""
						loading="lazy"
						class="h-14 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/10"
					/>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{session.movie.title}</p>
						<p class="text-xs text-muted-foreground">
							{formatShortDate(session.watchedAt)}{session.isRewatch ? ' · revisto' : ''}
						</p>
					</div>
					{#if session.rating}
						<RatingBadge rating={session.rating} class="text-xs" />
					{/if}
				</a>
			</li>
		{/each}
	</ol>
</section>
