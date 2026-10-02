<script lang="ts">
	import type { UserChip } from '$lib/social/types';

	/** Foto do perfil ou a inicial sobre o degradê da marca. */
	let { user, class: className = 'size-9' }: { user: UserChip; class?: string } = $props();

	const initial = $derived((user.name ?? user.username).charAt(0).toUpperCase());
</script>

{#if user.avatarUrl}
	<img
		src={user.avatarUrl}
		alt=""
		referrerpolicy="no-referrer"
		class={['shrink-0 rounded-full object-cover ring-1 ring-white/15', className]}
	/>
{:else}
	<span
		class={[
			'grid shrink-0 place-items-center rounded-full bg-linear-to-br from-neon-pink to-neon-purple font-semibold text-background',
			className
		]}
		aria-hidden="true">{initial}</span
	>
{/if}
