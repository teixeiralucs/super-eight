import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/private', () => ({ TMDB_READ_ACCESS_TOKEN: 'test-token' }));

const {
	isShowcaseable,
	pickLogo,
	pickTranslation,
	pickTrailer,
	regionalRelease,
	toMovie,
	toMovieCache,
	toMovieFull
} = await import('./tmdb');
const { creditIds, toWatchOptions, toWatchRows } = await import('./tmdb-normalize');

const raw = {
	id: 1,
	title: 'A Odisseia',
	original_title: 'The Odyssey',
	overview: 'Sinopse',
	poster_path: '/poster.jpg',
	backdrop_path: '/backdrop.jpg',
	release_date: '2026-07-16',
	vote_average: 8.0172,
	genre_ids: [28, 12, 999],
	adult: false
};

describe('toMovie', () => {
	it('normaliza campos e resolve nomes de gênero', () => {
		const genres = new Map([
			[28, 'Ação'],
			[12, 'Aventura']
		]);

		expect(toMovie(raw, genres)).toEqual({
			id: 1,
			title: 'A Odisseia',
			originalTitle: 'The Odyssey',
			overview: 'Sinopse',
			posterPath: '/poster.jpg',
			backdropPath: '/backdrop.jpg',
			releaseDate: '2026-07-16',
			year: 2026,
			voteAverage: 8,
			genres: ['Ação', 'Aventura']
		});
	});

	it('trata data de lançamento vazia', () => {
		const movie = toMovie({ ...raw, release_date: '' }, new Map());
		expect(movie.releaseDate).toBeNull();
		expect(movie.year).toBeNull();
	});
});

describe('isShowcaseable', () => {
	it('exclui conteúdo adulto e filmes sem pôster', () => {
		expect(isShowcaseable(raw)).toBe(true);
		expect(isShowcaseable({ ...raw, adult: true })).toBe(false);
		expect(isShowcaseable({ ...raw, softcore: true })).toBe(false);
		expect(isShowcaseable({ ...raw, poster_path: null })).toBe(false);
	});
});

describe('toMovieCache', () => {
	const details = {
		...raw,
		title: 'The Odyssey',
		original_title: 'Odysseia',
		original_language: 'el',
		runtime: 166,
		genres: [{ id: 18, name: 'Drama' }],
		origin_country: ['US'],
		production_countries: [{ iso_3166_1: 'GB' }],
		credits: {
			crew: [
				{ job: 'Director', name: 'Christopher Nolan' },
				{ job: 'Producer', name: 'Emma Thomas' }
			]
		},
		translations: {
			translations: [
				{ iso_639_1: 'pt', iso_3166_1: 'PT', data: { title: 'A Odisseia (PT)' } },
				{ iso_639_1: 'pt', iso_3166_1: 'BR', data: { title: 'A Odisseia' } },
				{ iso_639_1: 'es', iso_3166_1: 'ES', data: { title: 'La Odisea' } },
				{ iso_639_1: 'en', iso_3166_1: 'US', data: { title: '' } }
			]
		},
		images: {
			backdrops: [],
			posters: [
				{ file_path: '/pt-ruim.jpg', iso_639_1: 'pt', vote_average: 1 },
				{ file_path: '/pt-bom.jpg', iso_639_1: 'pt', vote_average: 5 }
			]
		}
	};

	it('guarda original, traduções (país preferido) e pôster por idioma', () => {
		const movie = toMovieCache(details);
		expect(movie.originalTitle).toBe('Odysseia');
		expect(movie.originalLanguage).toBe('el');
		// pt-BR antes de pt-PT; espanhol cai na Espanha sem tradução latina;
		// inglês vazio na tradução usa o título da própria resposta em inglês.
		expect(movie.titles).toEqual({ pt: 'A Odisseia', en: 'The Odyssey', es: 'La Odisea' });
		expect(movie.posters).toEqual({ pt: '/pt-bom.jpg', en: '/poster.jpg', es: '/poster.jpg' });
		expect(movie.genreIds).toEqual([18]);
		expect(movie.directors).toEqual(['Christopher Nolan']);
		expect(movie.countries).toEqual(['US']);
		expect(movie.runtime).toBe(166);
	});

	it('tradução igual ao original vira nulo; sem país de origem usa países de produção', () => {
		const movie = toMovieCache({
			...details,
			title: 'Odysseia',
			origin_country: [],
			translations: { translations: [] }
		});
		expect(movie.titles).toEqual({ pt: null, en: null, es: null });
		expect(movie.countries).toEqual(['GB']);
	});

	it('trata duração zero e créditos ausentes', () => {
		const movie = toMovieCache({ ...details, runtime: 0, credits: undefined });
		expect(movie.runtime).toBeNull();
		expect(movie.directors).toEqual([]);
	});
});

describe('pickTranslation', () => {
	it('ignora traduções vazias', () => {
		const t = [{ iso_639_1: 'es', iso_3166_1: 'MX', data: { title: '  ' } }];
		expect(pickTranslation(t, 'es', ['MX'])).toBeNull();
	});
});

describe('regionalRelease', () => {
	const dates = {
		results: [
			{
				iso_3166_1: 'BR',
				release_dates: [
					{ release_date: '2026-09-01T00:00:00.000Z', type: 4 },
					{ release_date: '2026-07-20T00:00:00.000Z', type: 3 }
				]
			}
		]
	};

	it('prefere a estreia em cinema na região', () => {
		expect(regionalRelease(dates, 'BR')).toBe('2026-07-20');
	});

	it('sem data para a região, nulo', () => {
		expect(regionalRelease(dates, 'US')).toBeNull();
		expect(regionalRelease(undefined, 'BR')).toBeNull();
	});
});

describe('pickTrailer', () => {
	const video = (over: Record<string, unknown>) => ({
		key: 'k',
		name: 'v',
		site: 'YouTube',
		type: 'Trailer',
		official: true,
		iso_639_1: 'en',
		...over
	});

	it('prefere trailer no idioma de quem vê, depois inglês oficial', () => {
		const videos = [
			video({ key: 'teaser-pt', type: 'Teaser', iso_639_1: 'pt' }),
			video({ key: 'en' }),
			video({ key: 'pt', iso_639_1: 'pt', official: false }),
			video({ key: 'featurette', type: 'Featurette', iso_639_1: 'pt' })
		];
		expect(pickTrailer(videos, 'pt')?.key).toBe('pt');
		expect(
			pickTrailer(
				videos.filter((v) => v.key !== 'pt'),
				'pt'
			)?.key
		).toBe('en');
		expect(pickTrailer(videos, 'es')?.key).toBe('en');
	});

	it('ignora vídeos fora do YouTube e retorna nulo sem trailer', () => {
		expect(pickTrailer([video({ site: 'Vimeo' })])).toBeNull();
		expect(pickTrailer([])).toBeNull();
	});
});

describe('toMovieFull', () => {
	it('extrai equipe com foto, música, estúdios e elenco ordenado', () => {
		const labels = {
			directing: 'Direção',
			writing: 'Roteiro',
			story: 'História',
			novel: 'Livro',
			characters: 'Personagens'
		};
		const movie = toMovieFull(
			{
				...raw,
				runtime: 120,
				genres: [],
				tagline: '',
				vote_count: 10,
				credits: {
					crew: [
						{ id: 10, job: 'Director', name: 'D', profile_path: '/d.jpg' },
						{ id: 11, job: 'Screenplay', name: 'W1' },
						{ id: 11, job: 'Story', name: 'W1' },
						{ id: 20, job: 'Original Music Composer', name: 'M' },
						{ job: 'Music Editor', name: 'X' }
					],
					cast: [
						{ id: 2, name: 'B', character: 'b', profile_path: null, order: 1 },
						{ id: 1, name: 'A', character: 'a', profile_path: '/a.jpg', order: 0 },
						// Mesmo ator em dois papéis (ex.: The House on Sorority Row)
						{ id: 2, name: 'B', character: 'b2', profile_path: null, order: 2 }
					]
				},
				production_companies: [
					{ id: 30, name: 'S1' },
					{ id: 31, name: 'S2' }
				]
			},
			'pt',
			'BR',
			labels
		);

		expect(movie.tagline).toBeNull();
		expect(movie.directing).toEqual([{ id: 10, name: 'D', job: 'Direção', profilePath: '/d.jpg' }]);
		expect(movie.writing).toEqual([
			{ id: 11, name: 'W1', job: 'Roteiro, História', profilePath: null }
		]);
		expect(movie.studios).toEqual([
			{ id: 30, name: 'S1' },
			{ id: 31, name: 'S2' }
		]);
		expect(movie.composers).toEqual([{ id: 20, name: 'M' }]);
		expect(movie.cast.map((c) => [c.name, c.character])).toEqual([
			['A', 'a'],
			['B', 'b / b2']
		]);
		expect(movie.trailer).toBeNull();
		expect(movie.logoPath).toBeNull();
	});
});

describe('pickLogo', () => {
	const logos = [
		{ path: '/en.png', language: 'en' },
		{ path: '/pt.png', language: 'pt' },
		{ path: '/ja.png', language: 'ja' }
	];

	it('prefere o idioma original, depois o de quem vê, depois inglês', () => {
		expect(pickLogo(logos, 'ja', 'pt')).toBe('/ja.png');
		expect(pickLogo(logos, 'ko', 'pt')).toBe('/pt.png');
		expect(pickLogo(logos, 'ko', 'es')).toBe('/en.png');
	});

	it('cai na mais votada, ou em nulo sem logos', () => {
		expect(pickLogo([{ path: '/zh.png', language: 'zh' }], 'ko', 'es')).toBe('/zh.png');
		expect(pickLogo([], 'en', 'pt')).toBeNull();
	});
});

describe('creditIds', () => {
	it('separa pessoas por função (roteiro inclui livro/história) e estúdios', () => {
		const ids = creditIds({
			...raw,
			runtime: 100,
			genres: [],
			credits: {
				crew: [
					{ id: 1, job: 'Director', name: 'D' },
					{ id: 2, job: 'Novel', name: 'Stephen King' },
					{ id: 2, job: 'Screenplay', name: 'Stephen King' },
					{ id: 3, job: 'Original Music Composer', name: 'M' },
					{ job: 'Writer', name: 'Sem ID' }
				],
				cast: [
					{ id: 5, name: 'B', character: 'b', profile_path: null, order: 1 },
					{ id: 4, name: 'A', character: 'a', profile_path: null, order: 0 }
				]
			},
			production_companies: [{ id: 9, name: 'Studio' }]
		});
		expect(ids).toEqual({
			directorIds: [1],
			writerIds: [2],
			castIds: [4, 5],
			composerIds: [3],
			studioIds: [9]
		});
	});
});

describe('onde assistir (§6.12)', () => {
	const p = (id: number, priority: number) => ({
		provider_id: id,
		provider_name: `P${id}`,
		logo_path: `/p${id}.png`,
		display_priority: priority
	});
	const raw = {
		results: {
			BR: {
				link: 'https://www.themoviedb.org/movie/1/watch?locale=BR',
				flatrate: [p(8, 2), p(307, 1)],
				ads: [p(300, 5)],
				free: [p(300, 5)],
				rent: [p(2, 9)]
			},
			US: { buy: [p(2, 1)] }
		}
	};

	it('junta assinatura, grátis e com anúncios, sem repetir, por prioridade', () => {
		expect(toWatchOptions(raw.results.BR)).toEqual({
			link: raw.results.BR.link,
			stream: [
				{ id: 307, name: 'P307', logoPath: '/p307.png' },
				{ id: 8, name: 'P8', logoPath: '/p8.png' },
				{ id: 300, name: 'P300', logoPath: '/p300.png' }
			],
			rent: [{ id: 2, name: 'P2', logoPath: '/p2.png' }],
			buy: []
		});
		expect(toWatchOptions(undefined)).toBeNull();
		expect(toWatchOptions({ link: 'x' })).toBeNull();
	});

	it('linhas de cache por região e o catálogo de serviços', () => {
		const { regions, providers } = toWatchRows(raw);
		expect(regions).toEqual([
			{
				region: 'BR',
				link: raw.results.BR.link,
				flatrate: [307, 8],
				free: [300],
				rent: [2],
				buy: []
			},
			{ region: 'US', link: null, flatrate: [], free: [], rent: [], buy: [2] }
		]);
		expect(providers.map((provider) => provider.id).sort((a, b) => a - b)).toEqual([
			2, 8, 300, 307
		]);
	});
});

describe('uniqueBy (blindagem contra itens repetidos do TMDb)', () => {
	it('remove repetidos mantendo a primeira ocorrência', async () => {
		const { uniqueBy, toImages } = await import('./tmdb-normalize');
		expect(uniqueBy([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
		const image = (path: string, vote: number) => ({
			file_path: path,
			iso_639_1: null,
			vote_average: vote,
			width: 1,
			height: 1
		});
		// O filme 28169 tinha o mesmo pôster duas vezes.
		expect(toImages([image('/a.jpg', 5), image('/b.jpg', 9), image('/a.jpg', 5)])).toEqual([
			{ path: '/b.jpg', language: null },
			{ path: '/a.jpg', language: null }
		]);
	});
});
