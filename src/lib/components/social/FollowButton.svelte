<script lang="ts">
	import { enhance } from '$app/forms';
	import CheckIcon from '@lucide/svelte/icons/check';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import { m } from '$lib/paraglide/messages';

	/** Seguir / deixar de seguir. "Seguindo" vira "Deixar de seguir" ao passar o mouse. */
	let {
		username,
		isFollowing,
		size = 'md'
	}: { username: string; isFollowing: boolean; size?: 'sm' | 'md' } = $props();

	let busy = $state(false);
	const pad = $derived(size === 'sm' ? 'px-4 py-1.5 text-xs' : 'px-6 py-2.5 text-sm');
</script>

<form
	method="POST"
	action="/u/{username}?/{isFollowing ? 'unfollow' : 'follow'}"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update({ reset: false });
			busy = false;
		};
	}}
>
	{#if isFollowing}
		<button
			disabled={busy}
			class="group inline-flex items-center gap-2 rounded-full border border-white/20 {pad} font-medium transition hover:border-destructive hover:text-destructive disabled:opacity-60"
		>
			<CheckIcon class="size-4 group-hover:hidden" aria-hidden="true" />
			<span class="group-hover:hidden">{m.profile_following_state()}</span>
			<span class="hidden group-hover:inline">{m.profile_unfollow()}</span>
		</button>
	{:else}
		<button
			disabled={busy}
			class="inline-flex items-center gap-2 rounded-full bg-primary {pad} font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
		>
			<UserPlusIcon class="size-4" aria-hidden="true" />
			{m.profile_follow()}
		</button>
	{/if}
</form>
