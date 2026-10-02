// Compila as mensagens do Paraglide com as mesmas opções do vite.config.ts — útil para o
// `npm run check` enxergar chaves novas sem precisar subir o Vite.
import { compile } from '@inlang/paraglide-js';

await compile({
	project: './project.inlang',
	outdir: './src/lib/paraglide',
	emitTsDeclarations: true,
	strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
	cookieName: 'locale'
});
