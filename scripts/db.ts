// Prisma para scripts de linha de comando (fora do SvelteKit: sem aliases `$lib`/`$env`).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/lib/server/generated/prisma/client';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não definida (.env).');

export const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

/** Formato do arquivo de backup (versionado para mudanças futuras). */
export interface LibraryBackup {
	version: 1;
	exportedAt: string;
	username: string;
	/** IDs do TMDb, em ordem de adição — a lista "crua", fácil de reaproveitar. */
	tmdbIds: number[];
	movies: Awaited<ReturnType<typeof prisma.movie.findMany>>;
	library: {
		movieId: number;
		status: 'WANT_TO_WATCH' | 'WATCHED';
		rating: number | null;
		isFavorite: boolean;
		addedAt: string;
	}[];
	diary: {
		id: string;
		movieId: number;
		watchedAt: string;
		rating: number | null;
		isRewatch: boolean;
		note: string | null;
		createdAt: string;
	}[];
	artworks: { movieId: number; posterPath: string | null; backdropPath: string | null }[];
}
