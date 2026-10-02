import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { MovieUserData } from '$lib/movie/types';
import LibraryControls from './LibraryControls.svelte';

const userData = (library: MovieUserData['library']): MovieUserData => ({
	library,
	artwork: null,
	sessions: [
		{
			id: '00000000-0000-4000-8000-000000000001',
			watchedAt: new Date('2026-09-20T00:00:00Z'),
			rating: 8,
			isRewatch: false,
			note: null
		}
	]
});

const submit = () => {};

describe('LibraryControls', () => {
	it('estado é só indicador (vem do diário) e nota/favorito ficam bloqueados', async () => {
		render(LibraryControls, {
			movieId: 1,
			submit,
			userData: userData({
				status: 'WANT_TO_WATCH',
				rating: null,
				isFavorite: false,
				watchCount: 0
			})
		});

		await expect.element(page.getByText('Quero ver', { exact: true })).toBeInTheDocument();
		expect(page.getByRole('button', { name: /Quero ver|Assistido/ }).all()).toHaveLength(0);
		await expect.element(page.getByRole('button', { name: '7 estrelas' })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: 'Favoritar' })).toBeDisabled();
	});

	it('fora da biblioteca oferece adicionar em Quero ver', async () => {
		render(LibraryControls, { movieId: 1, submit, userData: userData(null) });
		await expect.element(page.getByRole('button', { name: /Adicionar em/ })).toBeInTheDocument();
	});

	it('nota em 10 estrelas; clicar na atual remove', async () => {
		render(LibraryControls, {
			movieId: 1,
			submit,
			userData: userData({ status: 'WATCHED', rating: 7, isFavorite: false, watchCount: 1 })
		});

		await expect.element(page.getByText('7/10')).toBeInTheDocument();
		const current = page.getByRole('button', { name: 'Remover nota (7 estrelas)' });
		await expect.element(current).toBeInTheDocument();
		expect((current.element() as HTMLButtonElement).value).toBe('');
		await expect
			.element(page.getByRole('button', { name: '10 estrelas' }))
			.toHaveAttribute('value', '10');
	});

	it('abre o diário em pop-up com data dd/mm/aaaa e a lista de sessões', async () => {
		render(LibraryControls, {
			movieId: 1,
			submit,
			userData: userData({ status: 'WATCHED', rating: null, isFavorite: false, watchCount: 1 })
		});

		await page.getByRole('button', { name: /Registrar sessão/ }).click();
		const dialog = page.getByRole('dialog', { name: 'Diário do filme' });
		await expect.element(dialog).toBeInTheDocument();

		const date = page.getByLabelText('Quando assistiu');
		await expect.element(date).toHaveAttribute('placeholder', 'dd/mm/aaaa');
		await date.fill('');
		await date.fill('05092026');
		await expect.element(date).toHaveValue('05/09/2026');
		expect(document.querySelector<HTMLInputElement>('input[name="watchedAt"]')?.value).toBe(
			'2026-09-05'
		);

		await expect.element(page.getByText('20 de setembro de 2026')).toBeInTheDocument();

		await page.getByRole('button', { name: 'Fechar diário' }).click();
		await expect.element(dialog).not.toBeInTheDocument();
	});
});
