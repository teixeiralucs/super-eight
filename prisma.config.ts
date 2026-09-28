import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations'
	},
	datasource: {
		// CLI (migrate, studio) usa a conexão direta/session pooler.
		// A aplicação usa DATABASE_URL (transaction pooler) via adapter em src/lib/server/db.ts.
		// Leitura opcional: `prisma generate` (CI, Vercel) não precisa de banco.
		url: process.env.DIRECT_URL ?? ''
	}
});
