<script lang="ts">
	import StarIcon from '@lucide/svelte/icons/star';

	/**
	 * Nota de 1 a 10 em 5 estrelas: cada metade de estrela vale 1 ponto.
	 * - `submit`: cada metade é um botão de envio (`name="rating"`) do formulário em volta;
	 *   clicar na nota atual a remove.
	 * - `pick`: só escolhe o valor (`onpick`), para usar dentro de outro formulário.
	 */
	let {
		value,
		mode = 'submit',
		disabled = false,
		size = 'md',
		label = 'Sua nota',
		onpick
	}: {
		value: number | null;
		mode?: 'submit' | 'pick';
		disabled?: boolean;
		size?: 'sm' | 'md';
		label?: string;
		onpick?: (value: number | null) => void;
	} = $props();

	let hover = $state<number | null>(null);
	const shown = $derived(disabled ? (value ?? 0) : (hover ?? value ?? 0));
	const iconSize = $derived(size === 'md' ? 'size-7' : 'size-5');

	/** 0, 0,5 ou 1 — quanto da estrela fica preenchido. */
	const fillOf = (star: number) => Math.min(Math.max((shown - (star - 1) * 2) / 2, 0), 1);
	const describe = (points: number) =>
		`${(points / 2).toLocaleString('pt-BR')} ${points === 2 ? 'estrela' : 'estrelas'}`;
</script>

<div
	class={['flex', disabled && 'opacity-40']}
	role="group"
	aria-label={label}
	onmouseleave={() => (hover = null)}
>
	{#each [1, 2, 3, 4, 5] as star (star)}
		<span class={['relative shrink-0', iconSize]}>
			<StarIcon class={[iconSize, 'text-white/25']} strokeWidth={1.5} aria-hidden="true" />
			<span
				class="absolute inset-y-0 left-0 overflow-hidden"
				style:width="{fillOf(star) * 100}%"
				aria-hidden="true"
			>
				<StarIcon
					class={[iconSize, 'max-w-none fill-neon-peach text-neon-peach']}
					strokeWidth={1.5}
				/>
			</span>
			{#each [star * 2 - 1, star * 2] as points, half (points)}
				<button
					type={mode === 'submit' ? 'submit' : 'button'}
					name={mode === 'submit' ? 'rating' : undefined}
					value={mode === 'submit' ? (value === points ? '' : points) : undefined}
					{disabled}
					aria-label={value === points ? `Remover nota (${describe(points)})` : describe(points)}
					aria-pressed={value === points}
					class={[
						'absolute inset-y-0 w-1/2 disabled:cursor-not-allowed',
						half === 0 ? 'left-0' : 'right-0'
					]}
					onmouseenter={() => (hover = points)}
					onfocus={() => (hover = points)}
					onblur={() => (hover = null)}
					onclick={() => mode === 'pick' && onpick?.(value === points ? null : points)}
				></button>
			{/each}
		</span>
	{/each}
</div>
