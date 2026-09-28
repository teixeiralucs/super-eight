<script lang="ts">
	// TEMPORÁRIO: UI mínima para validar o fluxo de auth. Será substituída pela tela final.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const next = $derived(page.url.searchParams.get('next'));
	const withNext = (action: string) =>
		next ? `?/${action}&next=${encodeURIComponent(next)}` : `?/${action}`;
</script>

<main class="mx-auto flex max-w-sm flex-col gap-4 p-8">
	<h1 class="text-2xl font-semibold">Entrar</h1>

	{#if data.callbackError}
		<p class="text-sm text-red-600">Não foi possível concluir o login. Tente novamente.</p>
	{/if}
	{#if form && 'message' in form && form.message}
		<p class="text-sm text-red-600">{form.message}</p>
	{/if}

	<form method="POST" action={withNext('login')} class="flex flex-col gap-3">
		<label class="flex flex-col gap-1">
			E-mail
			<input
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form && 'email' in form ? form.email : ''}
				class="rounded border px-3 py-2"
			/>
		</label>
		{#if form && 'errors' in form && form.errors?.email}
			<p class="text-sm text-red-600">{form.errors.email[0]}</p>
		{/if}

		<label class="flex flex-col gap-1">
			Senha
			<input
				name="password"
				type="password"
				autocomplete="current-password"
				required
				class="rounded border px-3 py-2"
			/>
		</label>

		<button class="rounded bg-black px-3 py-2 text-white">Entrar</button>
	</form>

	<form method="POST" action={withNext('google')}>
		<button class="w-full rounded border px-3 py-2">Entrar com Google</button>
	</form>

	<p class="text-sm">
		Não tem conta? <a href={resolve('/signup')} class="underline">Criar conta</a>
	</p>
</main>
