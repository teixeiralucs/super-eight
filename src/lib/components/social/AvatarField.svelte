<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import Avatar from './Avatar.svelte';
	import { confirmAction } from '$lib/feedback/confirm.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { UserChip } from '$lib/social/types';

	/**
	 * Foto de perfil (earlySetup.md §6.6.6). A imagem é cortada em quadrado (centro) e reduzida a
	 * 256×256 em WebP no navegador; o envio vai direto para as actions `?/avatar` e
	 * `?/removeAvatar` da página (sem <form>: fica dentro do formulário do perfil).
	 */
	let { user }: { user: UserChip } = $props();

	const SIZE = 256;
	let busy = $state(false);
	let input: HTMLInputElement | undefined = $state();

	/** Corte quadrado central + redução. WebP quando o navegador sabe gerar; senão PNG. */
	async function square(file: File): Promise<Blob> {
		const bitmap = await createImageBitmap(file);
		const side = Math.min(bitmap.width, bitmap.height);
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = SIZE;
		const context = canvas.getContext('2d')!;
		context.imageSmoothingQuality = 'high';
		context.drawImage(
			bitmap,
			(bitmap.width - side) / 2,
			(bitmap.height - side) / 2,
			side,
			side,
			0,
			0,
			SIZE,
			SIZE
		);
		bitmap.close();
		return new Promise((done, fail) =>
			canvas.toBlob((blob) => (blob ? done(blob) : fail(new Error('toBlob'))), 'image/webp', 0.85)
		);
	}

	async function send(action: 'avatar' | 'removeAvatar', body = new FormData()) {
		busy = true;
		try {
			const response = await fetch(`?/${action}`, {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await response.text());
			if (result.type === 'success') {
				toast.success(action === 'avatar' ? m.toast_avatar_saved() : m.toast_avatar_removed());
				await invalidateAll();
			} else {
				const message =
					result.type === 'failure' && typeof result.data?.message === 'string'
						? result.data.message
						: m.error_avatar_upload();
				toast.error(message);
			}
		} catch {
			toast.error(m.error_avatar_upload());
		} finally {
			busy = false;
		}
	}

	async function onchange(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			toast.error(m.error_avatar_invalid());
			return;
		}
		let blob: Blob;
		try {
			blob = await square(file);
		} catch {
			toast.error(m.error_avatar_invalid());
			return;
		}
		const body = new FormData();
		body.set('avatar', blob, `avatar.${blob.type === 'image/webp' ? 'webp' : 'png'}`);
		await send('avatar', body);
	}

	async function remove() {
		const confirmed = await confirmAction({
			title: m.confirm_remove_avatar_title(),
			confirmLabel: m.action_remove(),
			destructive: true
		});
		if (confirmed) await send('removeAvatar');
	}
</script>

<div class="flex items-center gap-5">
	<button
		type="button"
		onclick={() => input?.click()}
		disabled={busy}
		class="group relative shrink-0 rounded-full"
		aria-label={m.settings_avatar_change()}
	>
		<Avatar {user} class="size-20 text-2xl" />
		<span
			class="absolute inset-0 grid place-items-center rounded-full bg-background/60 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
			class:opacity-100={busy}
			aria-hidden="true"
		>
			{#if busy}
				<LoaderCircleIcon class="size-6 animate-spin" />
			{:else}
				<CameraIcon class="size-6" />
			{/if}
		</span>
	</button>
	<div class="flex flex-col items-start gap-1.5">
		<button
			type="button"
			onclick={() => input?.click()}
			disabled={busy}
			class="text-sm font-medium text-white transition hover:text-neon-cyan disabled:opacity-50"
		>
			{user.avatarUrl ? m.settings_avatar_change() : m.settings_avatar_add()}
		</button>
		{#if user.avatarUrl}
			<button
				type="button"
				onclick={remove}
				disabled={busy}
				class="text-xs text-white/50 transition hover:text-destructive disabled:opacity-50"
			>
				{m.settings_avatar_remove()}
			</button>
		{/if}
		<p class="text-xs text-white/40">{m.settings_avatar_hint()}</p>
	</div>
	<input bind:this={input} type="file" accept="image/*" class="hidden" {onchange} />
</div>
