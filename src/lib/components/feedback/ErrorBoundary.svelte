<script lang="ts">
	import type { Snippet } from 'svelte';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { reportClientError } from '$lib/client/report-error';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Contém um erro de tela (earlySetup.md §6.4.7): se algo aqui dentro quebrar, só esta parte
	 * mostra o aviso (com "Tentar de novo") e o erro é registrado; o resto da página segue.
	 */
	let { children, class: className = '' }: { children: Snippet; class?: string } = $props();
</script>

<svelte:boundary onerror={(error) => reportClientError(error, 'boundary')}>
	{@render children()}

	<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -- o erro já foi registrado em onerror -->
	{#snippet failed(_error, reset)}
		<div
			role="alert"
			class={[
				'flex flex-col items-center gap-3 rounded-3xl border border-white/10 px-6 py-10 text-center',
				className
			]}
		>
			<TriangleAlertIcon class="size-6 text-neon-peach" aria-hidden="true" />
			<p class="text-sm text-white/70">{m.boundary_message()}</p>
			<button
				type="button"
				onclick={reset}
				class="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-white/30"
			>
				<RotateCcwIcon class="size-4" aria-hidden="true" />
				{m.boundary_retry()}
			</button>
		</div>
	{/snippet}
</svelte:boundary>
