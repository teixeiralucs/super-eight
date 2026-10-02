// Confirmação de ações destrutivas (earlySetup.md §6.4.4): substitui o `confirm()` do navegador
// por um diálogo do app. Só é usado no navegador (o estado é do módulo, como o de um modal).

export interface ConfirmOptions {
	title: string;
	description?: string;
	confirmLabel: string;
	/** Botão de confirmar em vermelho (apagar, remover). */
	destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
	resolve: (ok: boolean) => void;
}

export const confirmState = $state<{ current: PendingConfirm | null }>({ current: null });

/** Abre o diálogo e resolve com a resposta (fechar/Esc = não). */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
	// Um de cada vez: um pedido novo cancela o anterior.
	confirmState.current?.resolve(false);
	return new Promise((resolve) => {
		confirmState.current = {
			...options,
			resolve: (ok) => {
				confirmState.current = null;
				resolve(ok);
			}
		};
	});
}

/** Há uma confirmação aberta? Pop-ups e modais por baixo ignoram Esc e "clique fora" enquanto isso. */
export const isConfirmOpen = () => confirmState.current !== null;
