/** Violação de regra de negócio (vira `fail(400)` na action). */
export class LibraryRuleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'LibraryRuleError';
	}
}
