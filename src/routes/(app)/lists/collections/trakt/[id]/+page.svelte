<script lang="ts">
	import CollectionPage from '$lib/components/lists/CollectionPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<CollectionPage collection={data.collection} />
