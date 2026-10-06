<script lang="ts" module>
	/** Formatos de página da área logada (cada um imita o layout real). */
	export type SkeletonKind = 'library' | 'grid' | 'rows' | 'cards' | 'hero' | 'profile' | 'form';

	/** Formato pela rota de destino (`navigating.to.route.id`). */
	export function skeletonFor(routeId: string | null): SkeletonKind {
		if (!routeId) return 'rows';
		if (routeId === '/(app)/dashboard') return 'library';
		if (routeId === '/(app)/search') return 'grid';
		if (routeId === '/(app)/stats') return 'library';
		if (routeId === '/(app)/notifications') return 'rows';
		if (routeId.startsWith('/(app)/library/')) return 'profile';
		if (routeId === '/(app)/lists') return 'cards';
		if (routeId.startsWith('/(app)/lists/')) return 'hero';
		if (routeId === '/(app)/u/[username]') return 'profile';
		if (routeId.startsWith('/(app)/settings')) return 'form';
		return 'rows';
	}
</script>

<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/**
	 * Placeholder da página de destino enquanto os dados dela chegam (earlySetup.md §6.4.1):
	 * blocos com o formato do layout real, em vez de a tela antiga ficar parada.
	 */
	let { kind }: { kind: SkeletonKind } = $props();

	const block = 'animate-pulse rounded-2xl bg-white/[0.06]';
	const posters = Array.from({ length: 12 }, (_, i) => i);
	const rows = Array.from({ length: 6 }, (_, i) => i);
</script>

<div
	class="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 pt-6 pb-16 md:px-10"
	aria-busy="true"
	role="status"
>
	<span class="sr-only">{m.loading()}</span>

	{#if kind === 'hero'}
		<div class="{block} h-[340px] rounded-3xl md:h-[420px]"></div>
	{:else if kind === 'profile'}
		<div class="flex items-center gap-5">
			<div class="{block} size-24 rounded-full"></div>
			<div class="flex flex-1 flex-col gap-3">
				<div class="{block} h-9 w-64 max-w-full"></div>
				<div class="{block} h-4 w-80 max-w-full"></div>
			</div>
		</div>
		<div class="flex gap-6">
			{#each [0, 1, 2, 3] as i (i)}<div class="{block} h-12 w-20"></div>{/each}
		</div>
	{:else}
		<!-- Cabeçalho: rótulo + título grande -->
		<div class="flex flex-col gap-3 pb-2">
			<div class="{block} h-3 w-28"></div>
			<div class="{block} h-12 w-80 max-w-full md:h-16"></div>
		</div>
	{/if}

	{#if kind === 'library'}
		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
			<div class="{block} aspect-[16/8] rounded-3xl"></div>
			<div class="{block} hidden rounded-3xl lg:block"></div>
		</div>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			{#each [0, 1, 2, 3] as i (i)}<div class="{block} h-28"></div>{/each}
		</div>
	{/if}

	{#if kind === 'library' || kind === 'grid' || kind === 'hero' || kind === 'profile'}
		<ul
			class="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6"
		>
			{#each posters as i (i)}
				<li class="flex flex-col gap-2.5">
					<div class="{block} aspect-[2/3] rounded-xl"></div>
					<div class="{block} h-3.5 w-3/4"></div>
					<div class="{block} h-3 w-1/2"></div>
				</li>
			{/each}
		</ul>
	{:else if kind === 'cards'}
		<div class="{block} h-10 w-72 rounded-full"></div>
		<ul class="grid gap-6 md:grid-cols-2">
			{#each [0, 1, 2, 3] as i (i)}<li class="{block} aspect-[16/8] rounded-3xl"></li>{/each}
		</ul>
	{:else if kind === 'form'}
		<div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
			{#each [0, 1, 2] as i (i)}<div class="{block} h-48 rounded-3xl"></div>{/each}
		</div>
	{:else if kind === 'rows'}
		<ol class="mx-auto flex w-full max-w-3xl flex-col gap-2">
			{#each rows as i (i)}
				<li class="flex gap-4 rounded-2xl border border-white/5 p-3">
					<div class="{block} h-24 w-16 shrink-0 rounded-lg"></div>
					<div class="flex flex-1 flex-col gap-2.5 py-1">
						<div class="{block} h-3.5 w-1/3"></div>
						<div class="{block} h-5 w-2/3"></div>
						<div class="{block} h-3 w-1/2"></div>
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</div>
