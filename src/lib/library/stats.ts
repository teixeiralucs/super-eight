// Cálculo das métricas do dashboard (puro, testável, sem acesso ao banco).

export interface StatsLibraryEntry {
	status: 'WANT_TO_WATCH' | 'WATCHED';
	rating: number | null;
	isFavorite: boolean;
	genres: string[];
}

export interface StatsDiaryEntry {
	watchedAt: Date;
	runtime: number | null;
}

export interface MonthBucket {
	/** Chave `YYYY-MM`. */
	key: string;
	label: string;
	sessions: number;
}

export interface DashboardStats {
	watched: number;
	watchlist: number;
	favorites: number;
	averageRating: number | null;
	sessionsThisYear: number;
	minutesWatched: number;
	monthly: MonthBucket[];
	topGenres: { genre: string; count: number }[];
	ratingHistogram: { rating: number; count: number }[];
}

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

/** Últimos `count` meses, do mais antigo ao atual (UTC). */
export function lastMonths(now: Date, count = 12): MonthBucket[] {
	return Array.from({ length: count }, (_, i) => {
		const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1));
		return {
			key: date.toISOString().slice(0, 7),
			label: monthLabel.format(date).replace('.', ''),
			sessions: 0
		};
	});
}

export function computeStats(
	library: StatsLibraryEntry[],
	diary: StatsDiaryEntry[],
	now = new Date()
): DashboardStats {
	const watched = library.filter((entry) => entry.status === 'WATCHED');
	const rated = library.filter((entry) => entry.rating !== null);

	const monthly = lastMonths(now);
	const byKey = new Map(monthly.map((bucket) => [bucket.key, bucket]));
	const year = now.getUTCFullYear();
	let sessionsThisYear = 0;
	let minutesWatched = 0;

	for (const session of diary) {
		minutesWatched += session.runtime ?? 0;
		if (session.watchedAt.getUTCFullYear() === year) sessionsThisYear++;
		const bucket = byKey.get(session.watchedAt.toISOString().slice(0, 7));
		if (bucket) bucket.sessions++;
	}

	const genreCounts = new Map<string, number>();
	for (const entry of watched) {
		for (const genre of entry.genres) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
	}

	const histogram = Array.from({ length: 10 }, (_, i) => ({ rating: i + 1, count: 0 }));
	for (const entry of rated) histogram[entry.rating! - 1].count++;

	return {
		watched: watched.length,
		watchlist: library.length - watched.length,
		favorites: library.filter((entry) => entry.isFavorite).length,
		averageRating: rated.length
			? Math.round((rated.reduce((sum, entry) => sum + entry.rating!, 0) / rated.length) * 10) / 10
			: null,
		sessionsThisYear,
		minutesWatched,
		monthly,
		topGenres: [...genreCounts]
			.map(([genre, count]) => ({ genre, count }))
			.sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre, 'pt-BR'))
			.slice(0, 5),
		ratingHistogram: histogram
	};
}
