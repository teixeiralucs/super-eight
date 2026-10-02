<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import LockIcon from '@lucide/svelte/icons/lock';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import MoviePosterCard from '$lib/components/MoviePosterCard.svelte';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import ListCard from '$lib/components/lists/ListCard.svelte';
	import Avatar from '$lib/components/social/Avatar.svelte';
	import FollowButton from '$lib/components/social/FollowButton.svelte';
	import ReviewCard from '$lib/components/social/ReviewCard.svelte';
	import { formatLongDate, formatShortDate } from '$lib/format';
	import { posterFromCard } from '$lib/library/poster';
	import { openMovie } from '$lib/movie/open.svelte';
	import { m } from '$lib/paraglide/messages';
	import { posterUrl } from '$lib/tmdb/images';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const profile = $derived(data.profile);
	const user = $derived(profile.user);
	const displayName = $derived(user.name ?? `@${user.username}`);

	const stats = $derived([
		{ label: m.stat_watched(), value: profile.stats.watched },
		{ label: m.stat_reviews(), value: profile.stats.reviews },
		{ label: m.stat_lists(), value: profile.stats.lists },
		{ label: m.stat_followers(), value: profile.stats.followers },
		{ label: m.stat_following(), value: profile.stats.following }
	]);

	const loginHref = $derived(
		`${resolve('/login')}?next=${encodeURIComponent(`/u/${user.username}`)}`
	);
	const section = 'pt-10';
	const heading = 'mb-5 font-display text-2xl font-semibold tracking-[-0.02em]';
</script>

<svelte:head>
	<title>{m.profile_page_title({ name: displayName, username: user.username })}</title>
	{#if user.bio && !profile.restricted}<meta name="description" content={user.bio} />{/if}
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col px-5 pt-6 pb-16 md:px-10">
	<!-- Cabeçalho -->
	<header
		class="flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between"
	>
		<div class="flex items-center gap-5">
			<Avatar {user} class="size-20 text-3xl md:size-24" />
			<div class="min-w-0">
				<h1
					class="font-display text-[clamp(2rem,4vw,3.5rem)] leading-none font-bold tracking-[-0.04em]"
				>
					{displayName}
				</h1>
				<p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/55">
					{#if user.name}<span>@{user.username}</span>{/if}
					{#if user.isPrivate}
						<span class="inline-flex items-center gap-1 text-white/70"
							><LockIcon class="size-3.5" aria-hidden="true" />{m.profile_private_badge()}</span
						>
					{/if}
					<span>{m.profile_member_since({ date: formatLongDate(user.createdAt) })}</span>
				</p>
				{#if user.bio && !profile.restricted}
					<p class="mt-3 max-w-xl text-sm leading-relaxed whitespace-pre-line text-white/80">
						{user.bio}
					</p>
				{/if}
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-3">
			{#if profile.isMe}
				<a
					href={resolve('/settings')}
					class="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm transition hover:border-white/50"
				>
					<PencilIcon class="size-4" aria-hidden="true" />
					{m.profile_edit()}
				</a>
			{:else if data.signedIn}
				<FollowButton username={user.username} isFollowing={profile.isFollowing} />
			{:else}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- loginHref vem de resolve('/login') -->
				<a
					href={loginHref}
					class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
					>{m.profile_follow()}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		</div>
	</header>

	<dl class="grid grid-cols-3 gap-4 border-b border-white/10 py-6 sm:grid-cols-5">
		{#each stats as stat (stat.label)}
			<div>
				<dt class="text-[11px] font-semibold tracking-[0.2em] text-white/45 uppercase">
					{stat.label}
				</dt>
				<dd class="mt-1 font-display text-3xl font-semibold tabular-nums">{stat.value}</dd>
			</div>
		{/each}
	</dl>

	{#if profile.restricted}
		<section class="{section} flex items-start gap-3 text-sm text-white/65">
			<LockIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			<p>{m.profile_private_text()}</p>
		</section>
	{:else}
		<!-- Favoritos -->
		<section class={section} aria-labelledby="favoritos">
			<h2 id="favoritos" class={heading}>{m.profile_favorites()}</h2>
			{#if profile.favorites.length}
				<ul
					class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6"
				>
					{#each profile.favorites as favorite (favorite.movie.id)}
						<li>
							<MoviePosterCard movie={posterFromCard(favorite.movie)} library={favorite.library} />
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-white/45">{m.profile_empty_section()}</p>
			{/if}
		</section>

		<!-- Diário recente (sem anotações: são privadas) -->
		<section class={section} aria-labelledby="recentes">
			<div class="mb-5 flex items-baseline justify-between gap-4">
				<h2 id="recentes" class="font-display text-2xl font-semibold tracking-[-0.02em]">
					{m.profile_recent()}
				</h2>
				{#if profile.isMe}
					<a href={resolve('/diary')} class="text-xs text-white/55 hover:text-white"
						>{m.profile_see_diary()}</a
					>
				{/if}
			</div>
			{#if profile.recentSessions.length}
				<ul class="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
					{#each profile.recentSessions as session (session.id)}
						<li class="w-28 shrink-0">
							<a
								href={resolve('/movie/[id]', { id: String(session.movie.id) })}
								onclick={(event) => openMovie(event, session.movie.id)}
								class="group block"
								title={session.movie.originalTitle}
							>
								<div
									class="relative aspect-2/3 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-neon-pink"
								>
									{#if session.movie.posterPath}
										<img
											src={posterUrl(session.movie.posterPath, 'w185')}
											alt={m.poster_of({ title: session.movie.originalTitle })}
											loading="lazy"
											class="size-full object-cover"
										/>
									{/if}
									{#if session.isRewatch}
										<span
											class="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-background/80"
											title={m.diary_rewatch()}
										>
											<RotateCcwIcon class="size-3" aria-hidden="true" />
										</span>
									{/if}
								</div>
								<p class="mt-1.5 flex items-center justify-between gap-1 text-xs">
									<span class="text-white/55">{formatShortDate(session.watchedAt)}</span>
									{#if session.rating}<RatingBadge
											rating={session.rating}
											class="text-[11px]"
										/>{/if}
								</p>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-white/45">{m.profile_empty_section()}</p>
			{/if}
		</section>

		<!-- Reviews -->
		<section class={section} aria-labelledby="reviews">
			<h2 id="reviews" class={heading}>{m.profile_reviews()}</h2>
			{#if profile.reviews.length}
				<div class="grid gap-4 lg:grid-cols-2">
					{#each profile.reviews as { review, movie } (review.id)}
						<ReviewCard
							{review}
							movieId={movie.id}
							signedIn={data.signedIn}
							onChanged={() => invalidateAll()}
						>
							{#snippet header()}
								<a
									href={resolve('/movie/[id]', { id: String(movie.id) })}
									onclick={(event) => openMovie(event, movie.id)}
									class="flex min-w-0 flex-1 items-center gap-3 hover:underline"
								>
									{#if movie.posterPath}
										<img
											src={posterUrl(movie.posterPath, 'w185')}
											alt=""
											class="h-14 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/10"
										/>
									{/if}
									<span class="min-w-0">
										<span class="block truncate text-sm font-medium">{movie.originalTitle}</span>
										{#if movie.title !== movie.originalTitle}
											<span class="block truncate text-xs text-white/50">{movie.title}</span>
										{/if}
									</span>
								</a>
							{/snippet}
						</ReviewCard>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-white/45">{m.profile_empty_section()}</p>
			{/if}
		</section>
	{/if}

	<!-- Listas (públicas para os outros; todas para o dono) -->
	<section class={section} aria-labelledby="listas">
		<h2 id="listas" class={heading}>
			{profile.isMe ? m.profile_my_lists() : m.profile_lists()}
		</h2>
		{#if profile.lists.length}
			<ul class="grid gap-6 md:grid-cols-2">
				{#each profile.lists as list (list.id)}
					<li><ListCard {list} /></li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-white/45">{m.profile_empty_section()}</p>
		{/if}
	</section>
</main>
