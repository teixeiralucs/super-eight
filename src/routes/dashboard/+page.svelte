<script lang="ts">
	// TEMPORÁRIO: só confirma sessão + leitura do perfil via Prisma. A grade da biblioteca vem depois.
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<main class="mx-auto flex max-w-xl flex-col gap-4 p-8">
	<h1 class="text-2xl font-semibold">Olá, @{data.profile.username}</h1>
	<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
		<dt class="font-medium">Nome</dt>
		<dd>{data.profile.name ?? '—'}</dd>
		<dt class="font-medium">E-mail</dt>
		<dd>{data.profile.email}</dd>
	</dl>

	<form method="POST" action="/logout">
		<button class="rounded border px-3 py-2">Sair</button>
	</form>
</main>
