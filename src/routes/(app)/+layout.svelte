<script lang="ts">
	import { navigating, page } from '$app/state';
	import AppShell from '$lib/components/app/AppShell.svelte';
	import RouteSkeleton, { skeletonFor } from '$lib/components/feedback/RouteSkeleton.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	/**
	 * Indo para outra página da área logada: depois de um instante, mostra o esqueleto dela
	 * (earlySetup.md §6.4.1). Mesma página com outra URL (abas, filtros, busca) não conta —
	 * essas telas têm o próprio retorno. A página atual fica montada (só escondida): se a
	 * navegação for cancelada, ela volta como estava.
	 */
	const target = $derived.by(() => {
		const to = navigating.to;
		if (!to || navigating.type === 'leave') return null;
		if (!to.route.id?.startsWith('/(app)')) return null;
		return to.url.pathname !== page.url.pathname ? to.route.id : null;
	});

	let skeleton = $state<string | null>(null);
	$effect(() => {
		const routeId = target;
		if (!routeId) {
			skeleton = null;
			return;
		}
		const timer = setTimeout(() => (skeleton = routeId), 200);
		return () => clearTimeout(timer);
	});
</script>

<AppShell profile={data.profile}>
	{#if skeleton}
		<RouteSkeleton kind={skeletonFor(skeleton)} />
	{/if}
	<div class={skeleton ? 'hidden' : 'contents'}>
		{@render children()}
	</div>
</AppShell>
