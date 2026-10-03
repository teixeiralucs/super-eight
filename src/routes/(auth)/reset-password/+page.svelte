<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';
	import AuthField from '$lib/components/auth/AuthField.svelte';
	import AuthHeading from '$lib/components/auth/AuthHeading.svelte';
	import FormMessage from '$lib/components/auth/FormMessage.svelte';
	import SubmitButton from '$lib/components/auth/SubmitButton.svelte';
	import { toast } from 'svelte-sonner';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let submitting = $state(false);
	const errors = $derived(form && 'errors' in form ? form.errors : undefined);
</script>

<svelte:head>
	<title>{m.reset_page_title()}</title>
</svelte:head>

<AuthHeading step="02" label={m.reset_label()} title={m.reset_title()}>
	{m.reset_intro()}
</AuthHeading>

{#if form && 'message' in form && form.message}
	<FormMessage>{form.message}</FormMessage>
{/if}

<form
	method="POST"
	class="mt-8 flex flex-col gap-6"
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			// Erros aparecem no formulário; no sucesso, toast e vai para o dashboard.
			if (result.type === 'redirect') toast.success(m.toast_password_changed());
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<AuthField
		label={m.field_new_password()}
		name="password"
		type="password"
		autocomplete="new-password"
		placeholder="••••••••"
		minlength={8}
		required
		error={errors?.password?.[0]}
	/>
	<AuthField
		label={m.field_confirm_password()}
		name="confirm"
		type="password"
		autocomplete="new-password"
		placeholder="••••••••"
		minlength={8}
		required
		error={errors?.confirm?.[0]}
	/>
	<SubmitButton {submitting} label={m.reset_submit()} busyLabel={m.reset_saving()} />
</form>
