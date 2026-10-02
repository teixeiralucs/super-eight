<script lang="ts">
	import { untrack } from 'svelte';
	import { todayIso } from '$lib/format';
	import { currentLocale } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Data digitada no formato do idioma (pt/es: dd/mm/aaaa; en: mm/dd/yyyy), independente do
	 * idioma do sistema — o `<input type="date">` segue o sistema, não o site.
	 * Envia `name` em ISO (YYYY-MM-DD), que é o que o servidor valida.
	 */
	let {
		name,
		label,
		value = $bindable()
	}: { name: string; label: string; value: string } = $props();

	const id = $props.id();

	/** Ordem dos campos: mês primeiro só no inglês (EUA). */
	const monthFirst = currentLocale() === 'en';

	function toText(iso: string) {
		if (!iso) return '';
		const [year, month, day] = iso.split('-');
		return monthFirst ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
	}

	/** Texto completo, válido e não futuro → ISO; senão `null`. */
	function parse(text: string) {
		const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
		if (!match) return null;
		const [, a, b, year] = match;
		const [day, month] = monthFirst ? [b, a] : [a, b];
		const iso = `${year}-${month}-${day}`;
		const date = new Date(`${iso}T00:00:00Z`);
		if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
		if (iso > todayIso() || Number(year) < 1888) return null;
		return iso;
	}

	// Texto digitado (pode estar incompleto); só vira `value` quando é uma data válida.
	let text = $state(untrack(() => toText(value)));
	$effect(() => {
		// Mudança de fora (atalhos, reset do formulário) → reflete no campo.
		const iso = value;
		untrack(() => {
			if (iso && parse(text) !== iso) text = toText(iso);
		});
	});
	let input: HTMLInputElement | undefined = $state();

	function onInput(event: Event & { currentTarget: HTMLInputElement }) {
		// Máscara: só dígitos, barras inseridas automaticamente.
		const digits = event.currentTarget.value.replace(/\D/g, '').slice(0, 8);
		text = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
		event.currentTarget.value = text;
		const iso = parse(text);
		value = iso ?? '';
		event.currentTarget.setCustomValidity(
			iso || !text ? '' : m.date_invalid({ format: m.date_format() })
		);
	}

	const quick = [
		{ label: m.date_today, offset: 0 },
		{ label: m.date_yesterday, offset: 1 }
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
					]}>{option.label()}</button
				>
			{/each}
		</div>
	</div>
	<input
		bind:this={input}
		{id}
		type="text"
		inputmode="numeric"
		data-autofocus
		autocomplete="off"
		placeholder={m.date_format()}
		value={text}
		oninput={onInput}
		required
		class="w-full border-b border-white/15 bg-transparent py-2 text-sm tabular-nums transition-colors outline-none placeholder:text-white/30 focus:border-neon-cyan"
	/>
	<input type="hidden" {name} {value} />
</div>
