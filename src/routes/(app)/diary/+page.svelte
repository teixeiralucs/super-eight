<script lang="ts">
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import NotebookPenIcon from '@lucide/svelte/icons/notebook-pen';
	import StatTile from '$lib/components/dashboard/StatTile.svelte';
	import DiaryCard from '$lib/components/diary/DiaryCard.svelte';
	import DiarySessionDrawer from '$lib/components/diary/DiarySessionDrawer.svelte';
	import { groupDiary } from '$lib/diary/group';
	import { formatMonthName } from '$lib/format';
	import type { DiaryLogEntry } from '$lib/diary/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Sempre por data assistida, da mais recente para a mais antiga (ordem do servidor).
	const years = $derived(groupDiary(data.entries));

	const thisYear = new Date().getFullYear();
	const stats = $derived({
		sessions: data.entries.length,
		thisYear: years.find((y) => y.year === thisYear)?.count ?? 0,
		moviesThisYear: new Set(
			data.entries
				.filter((entry) => entry.watchedAt.getUTCFullYear() === thisYear)
				.map((entry) => entry.movie.id)
		).size,
		movies: new Set(data.entries.map((entry) => entry.movie.id)).size,
		rewatches: data.entries.filter((entry) => entry.isRewatch).length
	});

	let selectedId = $state<string | null>(null);
	const selected = $derived(data.entries.find((entry) => entry.id === selectedId) ?? null);
	// Durante a animação de saída o painel ainda está na tela: mostra o último registro aberto
	// (que pode até já ter sido apagado) em vez de `null`.
	let lastShown: DiaryLogEntry | null = null;
	const shown = $derived.by(() => (selected ? (lastShown = selected) : lastShown));
</script>

<svelte:head>
	<title>{m.diary_page_title()}</title>
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<header class="flex flex-wrap items-end justify-between gap-4 pb-2">
		<div>
			<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">{m.diary()}</p>
			<h1
				class="mt-3 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-none font-bold tracking-[-0.04em]"
			>
				{m.diary_heading()}<span class="font-serif font-normal tracking-normal text-white/40 italic"
					>.</span
				>
			</h1>
		</div>

		{#if years.length > 1}
			<nav aria-label={m.diary_jump_year()} class="flex flex-wrap gap-1">
				{#each years as y (y.year)}
					<a
						href="#ano-{y.year}"
						class="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 tabular-nums transition hover:border-white/40 hover:text-white"
						>{y.year}</a
					>
				{/each}
			</nav>
		{/if}
	</header>

	{#if !data.entries.length}
		<section
			class="flex flex-col items-center gap-4 rounded-3xl border border-white/10 px-6 py-20 text-center"
		>
			<NotebookPenIcon class="size-8 text-neon-pink" aria-hidden="true" />
			<h2 class="font-display text-2xl font-semibold">{m.no_sessions_yet()}</h2>
			<p class="max-w-sm text-sm text-muted-foreground">
				{m.diary_empty_text()}
			</p>
			<a
				href={resolve('/search')}
				class="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
				>{m.search_movies()}</a
			>
		</section>
	{:else}
		<section aria-label={m.diary_summary()} class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
			<StatTile
				label={m.diary_stat_sessions()}
				value={String(stats.sessions)}
				accent="bg-neon-pink"
				caption={m.diary_stat_total()}
			/>
			<StatTile
				label={m.diary_stat_in_year({ year: thisYear })}
				value={String(stats.thisYear)}
				accent="bg-neon-cyan"
				caption={plural(stats.moviesThisYear, m.movies_count_one, m.movies_count_other)}
			/>
			<StatTile
				label={m.diary_stat_movies()}
				value={String(stats.movies)}
				accent="bg-neon-purple"
				caption={m.diary_stat_distinct()}
			/>
			<StatTile
				label={m.diary_stat_rewatches()}
				value={String(stats.rewatches)}
				accent="bg-neon-peach"
				caption={plural(stats.rewatches, m.repeat_sessions_one, m.repeat_sessions_other)}
			/>
		</section>

		{#each years as y (y.year)}
			<section id="ano-{y.year}" aria-labelledby="ano-{y.year}-title" class="scroll-mt-24 pt-10">
				<div class="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
					<h2
						id="ano-{y.year}-title"
						class="font-display text-6xl leading-none font-bold tracking-[-0.04em] tabular-nums md:text-8xl"
					>
						{y.year}
					</h2>
					<p class="pb-2 text-sm text-muted-foreground">
						{plural(y.count, m.sessions_count_one, m.sessions_count_other)}
					</p>
				</div>

				{#each y.months as month (month.key)}
					<div
						class="grid gap-x-10 gap-y-5 border-b border-white/5 py-8 last:border-b-0 lg:grid-cols-[180px_minmax(0,1fr)]"
					>
						<div class="self-start lg:sticky lg:top-24">
							<p class="font-mono text-xs tracking-widest text-muted-foreground">
								{String(month.month + 1).padStart(2, '0')}.
							</p>
							<h3
								class="mt-1 font-display text-3xl leading-none font-bold tracking-[-0.03em] first-letter:uppercase"
							>
								{formatMonthName(month.month)}
							</h3>
							<p class="mt-2 text-xs text-white/50">
								{plural(month.entries.length, m.sessions_count_one, m.sessions_count_other)}
							</p>
						</div>

						<ul
							class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-5"
						>
							{#each month.entries as entry (entry.id)}
								<li>
									<DiaryCard
										{entry}
										selected={entry.id === selectedId}
										onselect={() => (selectedId = entry.id)}
									/>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</section>
		{/each}
	{/if}
</main>

{#if selected && shown}
	<DiarySessionDrawer
		entry={shown}
		entries={data.entries}
		onselect={(entry) => (selectedId = entry.id)}
		ondeleted={(removed) => {
			// Continua no mesmo filme se ainda houver sessões dele; senão fecha.
			selectedId = data.entries.find((entry) => entry.movie.id === removed.movie.id)?.id ?? null;
		}}
		onClose={() => (selectedId = null)}
	/>
{/if}
