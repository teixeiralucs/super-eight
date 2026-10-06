/**
 * Erros que aconteceram no navegador de quem usa o app (earlySetup.md §6.4.7), do mais
 * recente ao mais antigo:
 *
 *   npm run errors            # últimos 20
 *   npm run errors -- 50      # últimos 50
 *   npm run errors -- clear   # apaga a lista (depois de corrigir)
 */
import { prisma } from './db';

const arg = process.argv[2];
if (arg === 'clear') {
	const { count } = await prisma.clientError.deleteMany();
	console.log(`✔ ${count} erros apagados`);
} else {
	const rows = await prisma.clientError.findMany({
		orderBy: { lastSeen: 'desc' },
		take: Number(arg) || 20
	});
	if (!rows.length) console.log('Nenhum erro registrado. 🎉');
	for (const row of rows) {
		const frame = row.stack
			?.split('\n')
			.find((line) => /^\s*at |@/.test(line))
			?.trim();
		console.log(
			[
				`● ${row.message}`,
				`  ${row.count}× · ${row.source} · ${row.route ?? '?'} · última: ${row.lastSeen.toISOString()} em ${row.url}`,
				frame ? `  ${frame}` : null
			]
				.filter(Boolean)
				.join('\n')
		);
	}
}
await prisma.$disconnect();
