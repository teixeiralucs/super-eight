<script lang="ts">
	/**
	 * Logo do Super Eight — "Super" em pincel neon (Mr Dafoe) + "EIGHT" espaçado,
	 * ladeado por trechos de película Super 8 (perfurações).
	 * - `stacked`: versão de destaque (hero, login).
	 * - `inline`: versão compacta para o cabeçalho.
	 */
	let {
		variant = 'inline',
		class: className = ''
	}: { variant?: 'inline' | 'stacked'; class?: string } = $props();

	const uid = $props.id();
	const glowPink = `glow-pink-${uid}`;
	const glowCyan = `glow-cyan-${uid}`;
	const holes = [0, 1, 2, 3, 4];
</script>

{#if variant === 'stacked'}
	<svg
		viewBox="0 0 420 200"
		role="img"
		aria-label="Super Eight"
		class={className}
		xmlns="http://www.w3.org/2000/svg"
	>
		<defs>
			<filter id={glowPink} x="-20%" y="-40%" width="140%" height="180%">
				<feGaussianBlur stdDeviation="3" result="b1" />
				<feGaussianBlur stdDeviation="9" result="b2" in="SourceGraphic" />
				<feMerge>
					<feMergeNode in="b2" />
					<feMergeNode in="b1" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
			<filter id={glowCyan} x="-20%" y="-60%" width="140%" height="220%">
				<feGaussianBlur stdDeviation="2.5" result="b" />
				<feMerge>
					<feMergeNode in="b" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<g filter="url(#{glowPink})" fill="var(--neon-pink)">
			<text
				x="210"
				y="112"
				text-anchor="middle"
				font-family="Mr Dafoe, cursive"
				font-size="118"
				transform="rotate(-6 210 100)">Super</text
			>
			<!-- traço de pincel -->
			<path
				d="M92 136 C 170 122, 260 116, 346 104 C 300 116, 210 128, 110 142 Z"
				transform="rotate(-6 210 100)"
			/>
		</g>

		<g filter="url(#{glowCyan})" fill="var(--neon-cyan)">
			<text
				x="210"
				y="182"
				text-anchor="middle"
				font-family="Inter Tight Variable, sans-serif"
				font-weight="500"
				font-size="22"
				letter-spacing="14">EIGHT</text
			>
			<!-- trechos de película -->
			{#each [0, 1] as side (side)}
				<g transform={side === 0 ? 'translate(58 166)' : 'translate(290 166)'}>
					<rect width="72" height="22" rx="2" fill="none" stroke="var(--neon-cyan)" />
					{#each holes as i (i)}
						<rect x={6 + i * 13.5} y="4" width="6" height="4" rx="1" />
						<rect x={6 + i * 13.5} y="14" width="6" height="4" rx="1" />
					{/each}
				</g>
			{/each}
		</g>
	</svg>
{:else}
	<svg
		viewBox="0 0 204 56"
		role="img"
		aria-label="Super Eight"
		class={className}
		xmlns="http://www.w3.org/2000/svg"
	>
		<defs>
			<filter id={glowPink} x="-20%" y="-50%" width="140%" height="200%">
				<feGaussianBlur stdDeviation="1.6" result="b1" />
				<feGaussianBlur stdDeviation="4" result="b2" in="SourceGraphic" />
				<feMerge>
					<feMergeNode in="b2" />
					<feMergeNode in="b1" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
			<filter id={glowCyan} x="-20%" y="-60%" width="140%" height="220%">
				<feGaussianBlur stdDeviation="1.2" result="b" />
				<feMerge>
					<feMergeNode in="b" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<g filter="url(#{glowPink})" fill="var(--neon-pink)">
			<text x="4" y="40" font-family="Mr Dafoe, cursive" font-size="46" transform="rotate(-6 50 30)"
				>Super</text
			>
		</g>
		<g filter="url(#{glowCyan})" fill="var(--neon-cyan)" transform="translate(8 0)">
			<text
				x="112"
				y="36"
				font-family="Inter Tight Variable, sans-serif"
				font-weight="500"
				font-size="13"
				letter-spacing="6">EIGHT</text
			>
			<rect
				x="112"
				y="42"
				width="76"
				height="6"
				rx="1"
				fill="none"
				stroke="var(--neon-cyan)"
				stroke-width="0.75"
			/>
			{#each [0, 1, 2, 3, 4, 5, 6] as i (i)}
				<rect x={115 + i * 10.4} y="44" width="4" height="2" rx="0.5" />
			{/each}
		</g>
	</svg>
{/if}
