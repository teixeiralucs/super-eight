<script lang="ts">
	import UserIcon from '@lucide/svelte/icons/user';

	/** Foto + nome + papel (personagem ou função na equipe). */
	let { name, role, profilePath }: { name: string; role: string; profilePath: string | null } =
		$props();
</script>

<li class="w-28 shrink-0">
	<div
		class="grid aspect-2/3 place-items-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10"
	>
		{#if profilePath}
			<img
				src="https://image.tmdb.org/t/p/w185{profilePath}"
				alt=""
				loading="lazy"
				decoding="async"
				class="size-full object-cover"
			/>
		{:else}
			<UserIcon class="size-8 text-white/20" aria-hidden="true" />
		{/if}
	</div>
	<p class="mt-2 truncate text-sm font-medium" title={name}>{name}</p>
	<p class="truncate text-xs text-white/55" title={role}>{role}</p>
</li>
