<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import StarIcon from '@lucide/svelte/icons/star';

	// Nota de 1 a 10 (earlySetup.md §1.6).
	let { rating, class: className = '' }: { rating: number; class?: string } = $props();
</script>

<span class={['inline-flex items-center gap-1 tabular-nums', className]}>
	<StarIcon class="size-3.5 fill-neon-peach text-neon-peach" aria-hidden="true" />
	<span class="sr-only">{m.rating_label()}</span>{rating}<span class="text-white/40">/10</span>
</span>
