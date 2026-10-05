<script lang="ts">
	import { resolve } from '$app/paths';
	import Avatar from './Avatar.svelte';
	import FollowButton from './FollowButton.svelte';
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import type { PersonSuggestion } from '$lib/social/types';

	/** Pessoas para seguir (§6.6.5), com o motivo da sugestão. Some quando não há ninguém. */
	let { suggestions }: { suggestions: PersonSuggestion[] } = $props();

	const reasonText = (reason: PersonSuggestion['reason']) => {
		switch (reason.kind) {
			case 'taste':
				return plural(reason.shared, m.suggestion_taste_one, m.suggestion_taste_other);
			case 'network':
				return reason.count > 1
					? m.suggestion_network_more({ username: reason.via, count: reason.count - 1 })
					: m.suggestion_network({ username: reason.via });
			case 'popular':
				return plural(reason.followers, m.suggestion_popular_one, m.suggestion_popular_other);
		}
	};
</script>

{#if suggestions.length}
	<section aria-labelledby="sugestoes" class="flex flex-col gap-3">
		<h2 id="sugestoes" class="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
			{m.suggestions_people_title()}
		</h2>
		<ul class="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
			{#each suggestions as { user, reason } (user.username)}
				<li
					class="flex w-44 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
				>
					<a
						href={resolve('/(app)/u/[username]', { username: user.username })}
						class="flex flex-col items-center gap-2 hover:underline"
					>
						<Avatar {user} class="size-14 text-lg" />
						<span class="w-full truncate text-sm font-medium"
							>{user.name ?? `@${user.username}`}</span
						>
					</a>
					{#if user.name}<span class="-mt-2 text-xs text-white/45">@{user.username}</span>{/if}
					<span class="line-clamp-2 min-h-8 text-[11px] leading-4 text-white/55">
						{reasonText(reason)}
					</span>
					<FollowButton username={user.username} isFollowing={false} size="sm" />
				</li>
			{/each}
		</ul>
	</section>
{/if}
