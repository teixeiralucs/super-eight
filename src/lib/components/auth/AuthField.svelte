<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	// Campo "só com linha" (referência do vídeo): rótulo pequeno em cima, sublinhado que acende no foco.
	let {
		label,
		name,
		error,
		hint,
		prefix,
		type = 'text',
		...rest
	}: {
		label: string;
		name: string;
		error?: string;
		hint?: string;
		prefix?: string;
	} & HTMLInputAttributes = $props();

	const id = $props.id();
	let revealed = $state(false);
	const isPassword = $derived(type === 'password');
	const describedBy = $derived(error ? `${id}-error` : hint ? `${id}-hint` : undefined);
</script>

<div>
	<label for={id} class="text-xs text-white/60">{label}</label>
	<div
		class={[
			'mt-1 flex items-center gap-2 border-b transition-colors focus-within:border-neon-cyan',
			error ? 'border-destructive' : 'border-white/15'
		]}
	>
		{#if prefix}<span class="text-white/40" aria-hidden="true">{prefix}</span>{/if}
		<input
			{id}
			{name}
			type={isPassword && revealed ? 'text' : type}
			aria-invalid={error ? true : undefined}
			aria-describedby={describedBy}
			class="w-full bg-transparent py-2.5 text-base outline-none placeholder:text-white/30"
			{...rest}
		/>
		{#if isPassword}
			<button
				type="button"
				onclick={() => (revealed = !revealed)}
				class="text-white/50 transition hover:text-white"
				aria-label={revealed ? 'Esconder senha' : 'Mostrar senha'}
				aria-pressed={revealed}
			>
				{#if revealed}<EyeOffIcon class="size-4" />{:else}<EyeIcon class="size-4" />{/if}
			</button>
		{/if}
	</div>
	{#if error}
		<p id="{id}-error" class="mt-1.5 text-xs text-destructive">{error}</p>
	{:else if hint}
		<p id="{id}-hint" class="mt-1.5 text-xs text-white/40">{hint}</p>
	{/if}
</div>
