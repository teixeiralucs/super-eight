<script lang="ts">
	import AppShell from '$lib/components/app/AppShell.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<AppShell profile={data.profile}>
	{@render children()}
</AppShell>
