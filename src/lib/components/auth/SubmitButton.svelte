<script lang="ts">
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	let { submitting, label, busyLabel }: { submitting: boolean; label: string; busyLabel: string } =
		$props();
</script>

<button
	disabled={submitting}
	class="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-70"
>
	{#if submitting}
		<LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
		{busyLabel}
	{:else}
		{label}
	{/if}
</button>
