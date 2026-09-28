<script lang="ts">
	// TEMPORÁRIO: UI mínima para validar o fluxo de auth. Será substituída pela tela final.
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<main class="mx-auto flex max-w-sm flex-col gap-4 p-8">
	<h1 class="text-2xl font-semibold">Criar conta</h1>

	{#if form && 'confirmEmail' in form}
		<p class="text-sm">Enviamos um link de confirmação para <strong>{form.email}</strong>.</p>
	{:else}
		{#if form && 'message' in form && form.message}
			<p class="text-sm text-red-600">{form.message}</p>
		{/if}

		<form method="POST" class="flex flex-col gap-3">
			<label class="flex flex-col gap-1">
				Username
				<input
					name="username"
					autocomplete="username"
					required
					value={form?.username ?? ''}
					class="rounded border px-3 py-2"
				/>
			</label>
			{#if form && 'errors' in form && form.errors?.username}
				<p class="text-sm text-red-600">{form.errors.username[0]}</p>
			{/if}

			<label class="flex flex-col gap-1">
				E-mail
				<input
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.email ?? ''}
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
					autocomplete="new-password"
					required
					class="rounded border px-3 py-2"
				/>
			</label>
			{#if form && 'errors' in form && form.errors?.password}
				<p class="text-sm text-red-600">{form.errors.password[0]}</p>
			{/if}

			<button class="rounded bg-black px-3 py-2 text-white">Criar conta</button>
		</form>

		<form method="POST" action="/login?/google">
			<button class="w-full rounded border px-3 py-2">Continuar com Google</button>
		</form>
	{/if}

	<p class="text-sm">Já tem conta? <a href={resolve('/login')} class="underline">Entrar</a></p>
</main>
