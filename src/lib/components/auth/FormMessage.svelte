<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import MailCheckIcon from '@lucide/svelte/icons/mail-check';

	// Aviso do formulário (erro geral ou confirmação). Ícone + texto: nunca só cor.
	let { tone = 'error', children }: { tone?: 'error' | 'success'; children: Snippet } = $props();
</script>

<p
	role={tone === 'error' ? 'alert' : 'status'}
	class={[
		'mt-6 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm',
		tone === 'error'
			? 'border-destructive/30 bg-destructive/10 text-white/90'
			: 'border-neon-cyan/30 bg-neon-cyan/10 text-white/90'
	]}
>
	{#if tone === 'error'}
		<CircleAlertIcon class="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
	{:else}
		<MailCheckIcon class="mt-0.5 size-4 shrink-0 text-neon-cyan" aria-hidden="true" />
	{/if}
	<span>{@render children()}</span>
</p>
