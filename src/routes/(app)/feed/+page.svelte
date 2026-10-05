<script lang="ts">
	import { resolve } from '$app/paths';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import ListVideoIcon from '@lucide/svelte/icons/list-video';
	import MessageSquareTextIcon from '@lucide/svelte/icons/message-square-text';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import UsersIcon from '@lucide/svelte/icons/users';
	import MovieMetaLine from '$lib/components/MovieMetaLine.svelte';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import ListCard from '$lib/components/lists/ListCard.svelte';
	import Avatar from '$lib/components/social/Avatar.svelte';
	import PeopleSuggestions from '$lib/components/social/PeopleSuggestions.svelte';
	import {
		formatLongDate,
		formatRelative,
		formatWeekday,
		movieMeta,
		todayIso,
		yearOf
	} from '$lib/format';
	import { openMovie } from '$lib/movie/open.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { FeedItem, FeedKind } from '$lib/social/types';
	import { posterUrl } from '$lib/tmdb/images';
	import type { PageData } from './$types';

	/**
	 * Feed (earlySetup.md §6.6.3): sessões, reviews e listas novas de quem você segue, numa
	 * linha do tempo por dia, com filtro por tipo e sugestões de pessoas para seguir.
	 */
	let { data }: { data: PageData } = $props();

	let filter = $state<'all' | FeedKind>('all');
	const filters = [
		['all', m.feed_filter_all],
		['session', m.feed_filter_sessions],
		['review', m.feed_filter_reviews],
		['list', m.feed_filter_lists]
	] as const;
	const counts = $derived({
		all: data.items.length,
		session: data.items.filter((item) => item.kind === 'session').length,
		review: data.items.filter((item) => item.kind === 'review').length,
		list: data.items.filter((item) => item.kind === 'list').length
	});
	const shown = $derived(
		filter === 'all' ? data.items : data.items.filter((item) => item.kind === filter)
	);

	/** Agrupa por dia (as datas do diário são meia-noite UTC). */
	const days = $derived.by(() => {
		const groups: { key: string; date: Date; items: FeedItem[] }[] = [];
		for (const item of shown) {
			const key = item.at.toISOString().slice(0, 10);
			let group = groups.at(-1);
			if (group?.key !== key) groups.push((group = { key, date: item.at, items: [] }));
			group.items.push(item);
		}
		return groups;
	});

	const dayLabel = (key: string, date: Date) =>
		key === todayIso()
			? m.feed_today()
			: key === todayIso(1)
				? m.feed_yesterday()
				: formatLongDate(date);

	/** Reviews com spoiler abertas pelo leitor. */
	let revealed = $state<string[]>([]);

	const movieHref = (id: number) => resolve('/movie/[id]', { id: String(id) });
	const profileHref = (username: string) => resolve('/(app)/u/[username]', { username });
	const card =
		'flex gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15';
</script>

<svelte:head>
	<title>{m.feed_page_title()}</title>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<header class="pb-2">
		<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">{m.nav_community()}</p>
		<h1
			class="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-none font-bold tracking-[-0.04em]"
		>
			{m.feed_heading()}<span class="font-serif font-normal tracking-normal text-white/40 italic"
				>.</span
			>
		</h1>
	</header>

	<PeopleSuggestions suggestions={data.suggestions} />

	{#if !data.items.length}
		<section
			class="flex flex-col items-center gap-4 rounded-3xl border border-white/10 px-6 py-20 text-center"
		>
			<UsersIcon class="size-8 text-neon-cyan" aria-hidden="true" />
			<h2 class="font-display text-2xl font-semibold">{m.feed_empty_title()}</h2>
			<p class="max-w-sm text-sm text-muted-foreground">{m.feed_empty_text()}</p>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- caminho vem de resolve(); a regra não suporta query string -->
			<a
				href="{resolve('/search')}?type=people"
				class="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
				>{m.feed_find_people()}</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</section>
	{:else}
		<div class="flex min-w-0 gap-1 overflow-x-auto" role="group" aria-label={m.feed_filter_label()}>
			{#each filters as [value, label] (value)}
				<button
					type="button"
					aria-pressed={filter === value}
					disabled={value !== 'all' && !counts[value]}
					onclick={() => (filter = value)}
					class={[
						'shrink-0 rounded-full px-4 py-1.5 text-xs transition',
						filter === value
							? 'bg-white text-background'
							: 'text-white/65 hover:text-white disabled:opacity-35 disabled:hover:text-white/65'
					]}
				>
					{label()}
					<span class="ml-1 tabular-nums opacity-60">{counts[value]}</span>
				</button>
			{/each}
		</div>

		{#each days as day (day.key)}
			<section aria-labelledby="dia-{day.key}">
				<h2
					id="dia-{day.key}"
					class="sticky top-18 z-10 -mx-2 mb-2 bg-background/95 px-2 py-2 text-xs font-semibold tracking-[0.2em] text-white/50 uppercase"
				>
					{dayLabel(day.key, day.date)}
					<span class="ml-1 tracking-normal text-white/30 normal-case"
						>· {formatWeekday(day.date)}</span
					>
				</h2>
				<ol class="space-y-2">
					{#each day.items as item (`${item.kind}:${item.id}`)}
						<li>
							<!-- Quem fez o quê -->
							{#snippet byline(icon: typeof EyeIcon, action: string)}
								{@const Icon = icon}
								<p class="flex flex-wrap items-center gap-x-1.5 text-sm text-white/60">
									<a
										href={profileHref(item.author.username)}
										class="inline-flex items-center gap-2 text-white hover:underline"
									>
										<Avatar user={item.author} class="size-6 text-[11px]" />
										<span class="font-medium">{item.author.name ?? `@${item.author.username}`}</span
										>
									</a>
									<Icon class="size-3.5" aria-hidden="true" />{action}
								</p>
							{/snippet}

							{#if item.kind === 'list'}
								<div
									class="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3"
								>
									<div class="flex items-center justify-between gap-3">
										{@render byline(ListVideoIcon, m.feed_created_list())}
										<span class="text-[11px] text-white/35">{formatRelative(item.createdAt)}</span>
									</div>
									<ListCard list={item.list} />
								</div>
							{:else}
								<div class={card}>
									<a
										href={movieHref(item.movie.id)}
										onclick={(event) => openMovie(event, item.movie.id)}
										class="shrink-0 self-start"
									>
										{#if item.movie.posterPath}
											<img
												src={posterUrl(item.movie.posterPath, 'w185')}
												alt={m.poster_of({ title: item.movie.originalTitle })}
												loading="lazy"
												class="h-24 w-16 rounded-lg object-cover ring-1 ring-white/10 transition hover:ring-2 hover:ring-neon-pink"
											/>
										{:else}
											<span class="block h-24 w-16 rounded-lg bg-white/5"></span>
										{/if}
									</a>
									<div class="min-w-0 flex-1">
										{#if item.kind === 'session'}
											{@render byline(
												item.isRewatch ? RotateCcwIcon : EyeIcon,
												item.isRewatch ? m.feed_rewatched() : m.feed_watched()
											)}
										{:else}
											{@render byline(MessageSquareTextIcon, m.feed_reviewed())}
										{/if}
										<a
											href={movieHref(item.movie.id)}
											onclick={(event) => openMovie(event, item.movie.id)}
											class="mt-1 block hover:underline"
										>
											<span class="font-display text-lg leading-tight font-semibold"
												>{item.movie.originalTitle}</span
											>
											<span class="ml-1 text-sm text-white/45 tabular-nums"
												>{yearOf(item.movie.releaseDate) ?? ''}</span
											>
										</a>
										{#if item.movie.title !== item.movie.originalTitle}
											<p class="truncate text-xs text-white/50">{item.movie.title}</p>
										{/if}
										{#if item.kind === 'session'}
											<MovieMetaLine
												meta={movieMeta(item.movie)}
												class="mt-1 max-w-sm text-xs text-white/45"
												directorClass="text-white/65"
											/>
										{:else if item.containsSpoilers && !revealed.includes(item.id)}
											<button
												type="button"
												onclick={() => (revealed = [...revealed, item.id])}
												class="mt-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
											>
												{m.feed_spoiler_show()}
											</button>
										{:else}
											<p class="mt-2 text-sm leading-relaxed whitespace-pre-line text-white/80">
												{item.content}
											</p>
										{/if}
									</div>
									<div class="flex shrink-0 flex-col items-end justify-between gap-2">
										<span class="text-[11px] text-white/35">{formatRelative(item.createdAt)}</span>
										{#if item.rating}<RatingBadge rating={item.rating} class="text-sm" />{/if}
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	{/if}
</main>
