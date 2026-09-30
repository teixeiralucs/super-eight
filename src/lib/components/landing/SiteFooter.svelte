<script lang="ts">
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/brand/Logo.svelte';
</script>

<footer class="border-t border-white/10">
	<div
		class="mx-auto grid max-w-[1600px] gap-10 px-5 py-12 md:grid-cols-[1fr_auto] md:items-end md:px-10"
	>
		<div class="space-y-4">
			<Logo class="h-10 w-auto" />
			<!-- Atribuição exigida pelos termos da API do TMDb (earlySetup.md §4.1.4).
			     O logo do TMDb deve ser menos proeminente que o do Super Eight. -->
			<a
				href="https://www.themoviedb.org/"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-block pt-2 opacity-80 transition hover:opacity-100"
			>
				<img src="/tmdb-logo.svg" alt="The Movie Database (TMDB)" class="h-3 w-auto" />
			</a>
			<p class="max-w-md text-xs leading-relaxed text-muted-foreground">
				Dados e imagens de filmes fornecidos por
				<a
					href="https://www.themoviedb.org/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-white/80 underline-offset-4 hover:underline">The Movie Database (TMDB)</a
				>. Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
			</p>
		</div>

		<nav aria-label="Rodapé" class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
			<a href={resolve('/search')} class="transition hover:text-white">Buscar</a>
			<a href={resolve('/login')} class="transition hover:text-white">Entrar</a>
			<a href={resolve('/signup')} class="transition hover:text-white">Criar conta</a>
			<span class="text-white/30">© {new Date().getFullYear()} Super Eight</span>
		</nav>
	</div>
</footer>
