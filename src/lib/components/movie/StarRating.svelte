<script lang="ts">
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import StarIcon from '@lucide/svelte/icons/star';

	/**
	 * Nota de 1 a 10 em 10 estrelas (1 estrela = 1 ponto).
	 * - `submit`: cada estrela é um botão de envio (`name="rating"`) do formulário em volta;
	 *   clicar na nota atual a remove.
	 * - `pick`: só escolhe o valor (`onpick`), para usar dentro de outro formulário.
	 */
	let {
		value,
		mode = 'submit',
		disabled = false,
		label = m.your_rating(),
		onpick
	}: {
		value: number | null;
		mode?: 'submit' | 'pick';
		disabled?: boolean;
		label?: string;
		onpick?: (value: number | null) => void;
	} = $props();

	let hover = $state<number | null>(null);
	const shown = $derived(disabled ? (value ?? 0) : (hover ?? value ?? 0));
	const describe = (points: number) => plural(points, m.stars_one, m.stars_other);
</script>

<div
	class={['flex', disabled && 'opacity-40']}
	role="group"
	aria-label={label}
	onmouseleave={() => (hover = null)}
>
	{#each Array.from({ length: 10 }, (_, i) => i + 1) as points (points)}
		<button
			type={mode === 'submit' ? 'submit' : 'button'}
			name={mode === 'submit' ? 'rating' : undefined}
			value={mode === 'submit' ? (value === points ? '' : points) : undefined}
			{disabled}
			aria-label={value === points
				? m.remove_rating({ stars: describe(points) })
				: describe(points)}
			aria-pressed={value === points}
			class="shrink-0 px-px disabled:cursor-not-allowed"
			onmouseenter={() => (hover = points)}
			onfocus={() => (hover = points)}
			onblur={() => (hover = null)}
			onclick={() => mode === 'pick' && onpick?.(value === points ? null : points)}
		>
			<StarIcon
				class={[
					'size-5 transition-colors',
					points <= shown ? 'fill-neon-peach text-neon-peach' : 'text-white/25'
				]}
				strokeWidth={1.5}
				aria-hidden="true"
			/>
		</button>
	{/each}
</div>
