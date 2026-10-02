<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { confirmState } from '$lib/feedback/confirm.svelte';
	import { m } from '$lib/paraglide/messages';

	/** Diálogo único de confirmação do app (ver $lib/feedback/confirm). */
	const current = $derived(confirmState.current);
	const id = $props.id();

	let cancelButton: HTMLButtonElement | undefined = $state();

	// Foco no "Cancelar": Enter por engano não apaga nada.
	$effect(() => {
		if (current) cancelButton?.focus();
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (current && event.key === 'Escape') {
			// Responde depois dos outros ouvintes do Esc: pop-ups e modais por baixo ainda
			// enxergam a confirmação aberta e não se fecham junto.
			const pending = current;
			setTimeout(() => pending.resolve(false));
		}
	}}
/>

{#if current}
	<!-- data-nested-dialog: o painel de detalhes do filme ignora o Esc enquanto este estiver aberto -->
	<div
		data-nested-dialog
		class="fixed inset-0 z-[90] grid place-items-center bg-background/80 p-4"
		transition:fade={{ duration: 120 }}
		onclick={(event) => event.target === event.currentTarget && current.resolve(false)}
		onkeydown={() => {}}
		role="presentation"
	>
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="{id}-title"
			aria-describedby={current.description ? `${id}-description` : undefined}
			class="w-full max-w-sm rounded-3xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/60"
			transition:scale={{ start: prefersReducedMotion.current ? 1 : 0.96, duration: 150 }}
		>
			<div class="flex items-start gap-4">
				{#if current.destructive}
					<span
						class="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive"
						aria-hidden="true"
					>
						<TriangleAlertIcon class="size-5" />
					</span>
				{/if}
				<div class="min-w-0">
					<h2 id="{id}-title" class="font-display text-lg leading-snug font-semibold">
						{current.title}
					</h2>
					{#if current.description}
						<p id="{id}-description" class="mt-2 text-sm leading-relaxed text-muted-foreground">
							{current.description}
						</p>
					{/if}
				</div>
			</div>
			<div class="mt-6 flex justify-end gap-2">
				<button
					bind:this={cancelButton}
					type="button"
					onclick={() => current.resolve(false)}
					class="rounded-full px-5 py-2.5 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
				>
					{m.list_cancel()}
				</button>
				<button
					type="button"
					onclick={() => current.resolve(true)}
					class={[
						'rounded-full px-5 py-2.5 text-sm font-semibold transition hover:brightness-110',
						current.destructive ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground'
					]}
				>
					{current.confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
