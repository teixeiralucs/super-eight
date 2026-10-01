<script lang="ts">
	import { untrack } from 'svelte';
	import { todayIso } from '$lib/format';

	/**
	 * Data no formato brasileiro (dd/mm/aaaa) independente do idioma do navegador —
	 * o `<input type="date">` segue o idioma do sistema (ex.: mm/dd/aaaa em inglês).
	 * Envia `name` em ISO (YYYY-MM-DD), que é o que o servidor valida.
	 */
	let {
		name,
		label,
		value = $bindable()
	}: { name: string; label: string; value: string } = $props();

	const id = $props.id();

	const toBr = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

	/** "dd/mm/aaaa" válido e não futuro → ISO; senão `null`. */
	function parseBr(text: string) {
		const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
		if (!match) return null;
		const [, day, month, year] = match;
		const iso = `${year}-${month}-${day}`;
		const date = new Date(`${iso}T00:00:00Z`);
		if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
		if (iso > todayIso() || Number(year) < 1888) return null;
		return iso;
	}

	// Texto digitado (pode estar incompleto); só vira `value` quando é uma data válida.
	let text = $state(untrack(() => toBr(value)));
	$effect(() => {
		// Mudança de fora (atalhos, reset do formulário) → reflete no campo.
		const iso = value;
		untrack(() => {
			if (iso && parseBr(text) !== iso) text = toBr(iso);
		});
	});
	let input: HTMLInputElement | undefined = $state();

	function onInput(event: Event & { currentTarget: HTMLInputElement }) {
		// Máscara: só dígitos, barras inseridas automaticamente.
		const digits = event.currentTarget.value.replace(/\D/g, '').slice(0, 8);
		text = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
		event.currentTarget.value = text;
		const iso = parseBr(text);
		value = iso ?? '';
		event.currentTarget.setCustomValidity(
			iso || !text ? '' : 'Use uma data válida (dd/mm/aaaa), que não esteja no futuro.'
		);
	}

	const quick = [
		{ label: 'Hoje', offset: 0 },
		{ label: 'Ontem', offset: 1 }
	];
</script>

<div>
	<div class="flex items-baseline justify-between">
		<label for={id} class="text-xs text-white/60">{label}</label>
		<div class="flex gap-1">
			{#each quick as option (option.offset)}
				<button
					type="button"
					onclick={() => {
						value = todayIso(option.offset);
						input?.setCustomValidity('');
					}}
					class={[
						'rounded-full px-2 py-0.5 text-[11px] transition',
						value === todayIso(option.offset)
							? 'bg-white/15 text-white'
							: 'text-white/50 hover:text-white'
					]}>{option.label}</button
				>
			{/each}
		</div>
	</div>
	<input
		bind:this={input}
		{id}
		type="text"
		inputmode="numeric"
		autocomplete="off"
		placeholder="dd/mm/aaaa"
		value={text}
		oninput={onInput}
		required
		class="w-full border-b border-white/15 bg-transparent py-2 text-sm tabular-nums transition-colors outline-none placeholder:text-white/30 focus:border-neon-cyan"
	/>
	<input type="hidden" {name} {value} />
</div>
