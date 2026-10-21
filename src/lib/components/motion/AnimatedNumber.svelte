<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	/**
	 * Número que conta até o valor quando aparece na tela e anima quando muda (Number
	 * Animation da beUI — earlySetup.md §6.4.8). Texto que não é número ("—") aparece como
	 * veio. O servidor já entrega o valor final (sem JavaScript, nada muda); com "reduzir
	 * movimento", também.
	 */
	let { value }: { value: string } = $props();

	const parsed = $derived.by(() => {
		const match = /^-?\d+(?:\.(\d+))?$/.exec(value);
		return match ? { number: Number(value), decimals: match[1]?.length ?? 0 } : null;
	});

	const tween = new Tween(0, { duration: 900, easing: cubicOut });
	let animate = $state(false);
	let element = $state<HTMLElement>();

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches || !element) return;
		// Começa do zero só quando o número entra na tela (ex.: rolando até as estatísticas).
		const observer = new IntersectionObserver((entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			observer.disconnect();
			animate = true;
		});
		observer.observe(element);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (animate && parsed) tween.target = parsed.number;
	});

	const shown = $derived(parsed && animate ? tween.current.toFixed(parsed.decimals) : value);
</script>

<span bind:this={element} class="tabular-nums">{shown}</span>
