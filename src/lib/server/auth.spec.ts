import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './auth';

describe('safeRedirectPath', () => {
	it('aceita caminhos internos', () => {
		expect(safeRedirectPath('/lists?tab=public')).toBe('/lists?tab=public');
	});

	it('usa o fallback quando não há destino', () => {
		expect(safeRedirectPath(null)).toBe('/dashboard');
		expect(safeRedirectPath('')).toBe('/dashboard');
	});

	it('bloqueia destinos externos', () => {
		expect(safeRedirectPath('https://evil.com')).toBe('/dashboard');
		expect(safeRedirectPath('//evil.com')).toBe('/dashboard');
		expect(safeRedirectPath('/\\evil.com')).toBe('/dashboard');
	});
});
