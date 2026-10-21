import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { toast } from 'svelte-sonner';
import { m } from '$lib/paraglide/messages';
import { confirmAction, type ConfirmOptions } from './confirm.svelte';

// Feedback padrão das mutações (earlySetup.md §6.4.2–6.4.4): todo `use:enhance` do app passa
// por aqui para ganhar trava contra envio repetido, confirmação opcional e toast.

type SubmitInput = Parameters<SubmitFunction>[0];

/** A partir de quanto tempo de espera o toast "Salvando…" aparece. */
const SLOW_MS = 450;
type Resolvable<T> = T | ((input: SubmitInput, result: ActionResult) => T);

export interface FeedbackOptions {
	/** Pergunta antes de enviar (ações destrutivas). Função → decide por envio (ou nulo = não pergunta). */
	confirm?: ConfirmOptions | ((input: SubmitInput) => ConfirmOptions | null | undefined);
	/** Toast de sucesso (nulo = nenhum). Calculado depois do callback, com o estado já atualizado. */
	success?: Resolvable<string | null | undefined>;
}

/** Nome da action a partir da URL do formulário ("/movie/1?/rate" → "rate"). */
export const actionName = (input: SubmitInput) =>
	input.action.search.replace(/^\?\/?/, '').split('&')[0];

function setPending(form: HTMLFormElement, pending: boolean) {
	const buttons = form.querySelectorAll<HTMLButtonElement>('button, input[type="submit"]');
	if (pending) {
		form.dataset.pending = 'true';
		form.setAttribute('aria-busy', 'true');
		for (const button of buttons) {
			if (button.disabled) button.dataset.wasDisabled = 'true';
			button.disabled = true;
		}
	} else {
		delete form.dataset.pending;
		form.removeAttribute('aria-busy');
		for (const button of buttons) {
			if (button.dataset.wasDisabled) delete button.dataset.wasDisabled;
			else button.disabled = false;
		}
	}
}

/**
 * Envolve um `SubmitFunction` (ou o comportamento padrão do SvelteKit, se omitido):
 * - ignora envios enquanto o anterior não termina (clique duplo, Enter repetido);
 * - pergunta antes, se `confirm`;
 * - toast de sucesso (`success`) e de erro (mensagem da action ou genérica).
 *   Falhas só com erros de campo (validação) ficam para o formulário mostrar.
 */
export function withFeedback(
	inner?: SubmitFunction,
	options: FeedbackOptions = {}
): SubmitFunction {
	return async (input) => {
		const form = input.formElement;
		if (form.dataset.pending) {
			input.cancel();
			return;
		}

		const question =
			typeof options.confirm === 'function' ? options.confirm(input) : options.confirm;
		if (question && !(await confirmAction(question))) {
			input.cancel();
			return;
		}

		// Envia `cancel` próprio para saber se o `inner` desistiu (e não travar o formulário).
		let cancelled = false;
		setPending(form, true);
		let callback: Awaited<ReturnType<SubmitFunction>>;
		try {
			callback = await inner?.({
				...input,
				cancel: () => {
					cancelled = true;
					input.cancel();
				}
			});
		} catch (err) {
			setPending(form, false);
			throw err;
		}
		if (cancelled) {
			setPending(form, false);
			return;
		}

		// Demorou? Um toast "Salvando…" aparece e depois vira o de sucesso/erro no mesmo lugar.
		let slowToast: string | number | undefined;
		const slow = setTimeout(() => {
			slowToast = toast.loading(m.toast_saving());
		}, SLOW_MS);

		return async (opts) => {
			clearTimeout(slow);
			try {
				if (callback) await callback(opts);
				else await opts.update();
			} finally {
				setPending(form, false);
			}

			const same = slowToast === undefined ? {} : { id: slowToast };
			const { result } = opts;
			if (result.type === 'success' || result.type === 'redirect') {
				const message =
					typeof options.success === 'function' ? options.success(input, result) : options.success;
				if (message) toast.success(message, same);
				else if (slowToast !== undefined) toast.dismiss(slowToast);
			} else if (result.type === 'failure') {
				const message = result.data?.message;
				if (typeof message === 'string') toast.error(message, same);
				else if (slowToast !== undefined) toast.dismiss(slowToast);
			} else if (result.type === 'error') {
				toast.error(m.error_generic(), same);
			}
		};
	};
}
