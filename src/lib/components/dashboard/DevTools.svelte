<script lang="ts">
	import { enhance } from '$app/forms';
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';

	// Só renderizado em `dev` (a página decide). As actions também recusam fora de dev.
	let { hasData }: { hasData: boolean } = $props();
	let busy = $state(false);

	const track = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
		};
	};
</script>

<div
	class="flex flex-wrap items-center gap-2 rounded-full border border-dashed border-neon-peach/40 px-3 py-1.5 text-xs"
>
	<span class="flex items-center gap-1.5 text-neon-peach">
		<FlaskConicalIcon class="size-3.5" aria-hidden="true" /> Dev
	</span>
	<form method="POST" action="?/seedDemo" use:enhance={track}>
		<button
			disabled={busy}
			class="rounded-full px-2 py-1 text-white/70 hover:text-white disabled:opacity-50"
		>
			{busy ? 'Carregando…' : 'Adicionar filmes de exemplo'}
		</button>
	</form>
	{#if hasData}
		<form method="POST" action="?/clearDemo" use:enhance={track}>
			<button
				disabled={busy}
				class="rounded-full px-2 py-1 text-white/50 hover:text-white disabled:opacity-50"
			>
				Limpar biblioteca
			</button>
		</form>
	{/if}
</div>
