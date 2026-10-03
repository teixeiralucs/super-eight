**ESSE DOCUMENTO SE REFERE ÀS INSTRUÇÕES INICIAIS PARA O DESENVOLVIMENTO DO SISTEMA WEB SUPER EIGHT**

# **1. O CONCEITO**

O Super Eight se apoia no conceito de Tracking de Filmes, semelhante ao Letterboxd, Trakt.tv ou IMDb, mas de uma maneira em que **a biblioteca pessoal de filmes do usuário é o foco principal do sistema**. O CRUD é voltado principalmente para isso.

- 1.1. **Biblioteca (Lista Principal):** exibida no `/dashboard` em formato de **grade**, com as informações básicas de cada filme (pôster, status de assistido, nota e favorito).
- 1.2. **Detalhes + Diário:** ao clicar em um filme da grade, são reveladas informações técnicas do filme (sinopse, duração, gêneros, direção, elenco, trailer) e o **diário** do usuário com aquele filme (cada vez que assistiu, com data, nota daquela sessão, se foi rewatch e anotações).
- 1.3. **Listas Personalizadas:** coleções temáticas criadas pelo usuário (ex.: "Melhores de terror dos anos 80"), exibidas no menu **Listas**.
- 1.4. **Social:** usuários podem seguir uns aos outros, ver perfis, curtir listas e reviews e comentar reviews.
- 1.5. **Escopo de conteúdo:** apenas **filmes**. Séries serão avaliadas somente após a estrutura de filmes estar madura.
- 1.6. **Avaliação:** notas de **1 a 10** (inteiros). Na UI, podem ser representadas como 5 estrelas com meia estrela (1 = ½ estrela, 10 = 5 estrelas).

# **2. Arquitetura e Definição de Stack**

## **2.1. Frontend (Interface e Reatividade)**

- 2.1.1. Framework Principal: SvelteKit com **Svelte 5 (Runes)**, focado em Server-Side Rendering para performance e SEO.
- 2.1.2. Estilização: Tailwind CSS.
- 2.1.3. Ecossistema de Componentes e UI Dinâmica (lógicas React/Framer Motion devem ser traduzidas para Svelte/`svelte/motion` quando necessário):
  - **Base Primária:** Shadcn-Svelte (botões, modais, formulários, dropdowns, skeletons, toasts via Sonner).
  - **Componentes Avançados 1:** **Rewamp UI** (`https://www.rewampui.com/components`) como referência — a estrutura HTML/Tailwind é convertida para componentes `.svelte`.
  - **Componentes Avançados 2:** **Hallmark** (`npx skills add nutlope/hallmark`), com o código gerado adaptado para a reatividade do SvelteKit.
  - ⚠️ Antes de incorporar código de Rewamp UI ou Hallmark, verificar a licença de uso de cada componente.
- 2.1.4. Gerenciamento de Estado Local: reatividade nativa do Svelte 5 (Runes), sem bibliotecas externas de estado.

## **2.2. Backend (Camada de Servidor do SvelteKit)**

- 2.2.1. Busca de Dados (Leitura): funções `load` (`+page.server.ts`) para injetar dados tipados nas páginas.
- 2.2.2. Mutações (Escrita): `Form Actions` nativos para requisições do usuário (criar listas, avaliar filmes, registrar no diário).
- 2.2.3. Autenticação e Gestão de Sessões: Supabase Auth integrado com `@supabase/ssr` via `hooks.server.ts`.
- 2.2.4. ORM: Prisma, garantindo tipagem estrita _end-to-end_.

## **2.3. Banco de Dados e Infraestrutura**

- 2.3.1. Banco de Dados Principal: PostgreSQL (hospedado no Supabase).
- 2.3.2. Controle de Versão de Dados: migrações gerenciadas estritamente pelo Prisma (`prisma migrate`). Regras que o Prisma não expressa nativamente (CHECK constraints, triggers) entram como SQL customizado dentro das próprias migrações.
- 2.3.3. Hospedagem e Deploy: Vercel (utilizando o `@sveltejs/adapter-vercel`).

# **3. Modelagem do Banco de Dados (Prisma Schema)**

## **3.1. Diretrizes Gerais do Prisma**

- 3.1.1. Provider: `postgresql`.
- 3.1.2. Relacionamentos: declarações explícitas de `@relation`.
  - Dados **pertencentes ao usuário** (biblioteca, diário, listas, reviews, likes, follows, comentários) usam `onDelete: Cascade` — deletar um usuário apaga tudo que é dele.
  - Relações com `Movie` usam o padrão `Restrict`: um filme em cache não pode ser removido enquanto estiver referenciado.
- 3.1.3. Integração com Supabase Auth: a entidade `User` (tabela `public.User`) usa como chave primária o mesmo `UUID` gerado pelo Supabase em `auth.users`.
- 3.1.4. Constraints via SQL: as notas (`rating`) devem ter `CHECK (rating BETWEEN 1 AND 10)` e o `Follow` deve ter `CHECK ("followerId" <> "followingId")`, ambos adicionados via SQL na migração, além da validação com Zod.

## **3.2. Entidade: User (Usuário)**

- 3.2.1. Campos: `id` (UUID de `auth.users`), `email` (único), `username` (único, usado na URL do perfil), `name`, `avatarUrl`, `bio`, `createdAt`, `updatedAt`.
- 3.2.2. Relacionamentos: biblioteca, diário, listas, reviews, follows, likes e comentários.

## **3.3. Entidade: Movie (Filme — Cache Local do TMDb)**

- _Objetivo: evitar chamadas excessivas à API do TMDb, garantir integridade referencial e permitir renderizar a grade sem consultar a API._
- 3.3.1. Campos: `id` (Int, = ID do TMDb), `originalTitle` e `originalLanguage` (o título no idioma original — português, inglês, russo, chinês… — é o **destaque** na UI), `titlePt`/`titleEn`/`titleEs` (traduções; nulo = sem tradução ou igual ao original), `posterPt`/`posterEn`/`posterEs` (o texto do pôster muda por idioma), `logoPt`/`logoEn`/`logoEs` (logo padrão do título para cada idioma de quem vê, escolhida como na página do filme), `backdropPath`, `releaseDate`, `runtime`, `genreIds` (IDs do TMDb; o nome é traduzido na hora), `directors`, `countries`, `voteAverage`, `createdAt`, `updatedAt` (data da última sincronização).
- 3.3.1-A. Traduções vêm de `append_to_response=translations` (pt-BR > pt-PT; en-US > en-GB; es-MX > outros países latinos > es-ES) e pôsteres de `images` (mais votado por idioma). `npm run movies:backfill-i18n` (re)preenche os filmes já cacheados.
- 3.3.2. Informações técnicas mais pesadas (elenco, equipe, trailers) **não** são persistidas: são buscadas no TMDb sob demanda, com cache HTTP (ver 4.3.3).

## **3.4. Entidade: LibraryEntry (Biblioteca / Lista Principal)**

- _Objetivo: representar o **estado atual** da relação entre um usuário e um filme. É a fonte da grade do `/dashboard`._
- 3.4.1. Campos: `status` (`WANT_TO_WATCH` | `WATCHED`), `rating` (Int 1–10, opcional — nota atual do usuário), `isFavorite` (Boolean), `addedAt`, `updatedAt`.
- 3.4.2. Chave Primária Composta: `@@id([userId, movieId])` — um filme aparece uma única vez na biblioteca de um usuário.
- 3.4.3. Regra de negócio: o status **segue o diário** e não é escolhido à mão. Registrar uma entrada faz _upsert_ da `LibraryEntry` com status `WATCHED`; apagar a última sessão do filme o devolve a `WANT_TO_WATCH` (limpando nota e favorito, §3.4.4). Adicionar sem sessão entra como `WANT_TO_WATCH`.
- 3.4.4. Regra de negócio: **só filmes assistidos (`WATCHED`) podem ter nota ou ser favoritos.** Garantida no banco por `CHECK` (`LibraryEntry_rating_favorite_require_watched_check`) e validada nas _actions_. Voltar um filme para `WANT_TO_WATCH` deve limpar nota e favorito.

## **3.4-A. Entidade: MovieArtwork ("DNA" visual do filme)**

- _Objetivo: guardar o pôster, o fundo e/ou a logo do título que o usuário escolheu na galeria do filme (imagens do TMDb em qualquer idioma)._
- 3.4-A.1. Campos: `posterPath`, `backdropPath`, `logoPath` (opcionais; nulo = imagem padrão do TMDb), `updatedAt`. Chave composta `@@id([userId, movieId])`; independe de o filme estar na biblioteca.
- 3.4-A.2. Regra: toda tela da área logada (dashboard, busca, listas) aplica as escolhas do usuário antes de exibir o filme (`withArtwork` em `$lib/server/artwork`). A logo só aparece no título da página do filme. A action valida que a imagem pertence ao filme; restaurar todas as imagens apaga a linha.

## **3.5. Entidade: DiaryEntry (Diário)**

- _Objetivo: registrar **cada sessão** em que o usuário assistiu um filme (permite rewatches)._
- 3.5.1. Campos: `id` (UUID), `watchedAt` (Date), `rating` (Int 1–10, opcional — nota daquela sessão), `isRewatch` (Boolean), `note` (texto opcional), `createdAt`, `updatedAt`.
- 3.5.2. Chaves Estrangeiras: `userId`, `movieId`.
- 3.5.3. Índice: `(userId, watchedAt desc)` para montar o diário cronológico.

## **3.6. Entidade: List (Lista Personalizada)**

- 3.6.1. Campos: `id` (UUID), `title`, `description` (opcional), `kind` (`RANKED` = numerada, ordem manual; `COLLECTION` = sem números, quem vê escolhe a ordenação; default `COLLECTION`), `isPublic` (Boolean, default `false`), `createdAt`, `updatedAt` (muda também ao adicionar/remover/reordenar filmes).
- 3.6.2. Chave Estrangeira: `userId`.
- 3.6.3. Relacionamentos: vários filmes (NxN via `ListMovie`) e likes.

## **3.6-A. Entidade: Collection (Coleção do TMDb)**

- _Objetivo: cache das sagas do TMDb (ex.: "Star Wars"), só leitura._
- 3.6-A.1. Campos: `id` (Int, = ID da coleção no TMDb), `namePt`/`nameEn`/`nameEs` (nome por idioma; pt/es nulos = sem tradução, a UI cai no inglês), `posterPath`, `backdropPath`, `partIds` (todos os filmes da coleção, por lançamento — o "3 de 8"), `parts` (JSON com título por idioma, pôster e data de cada parte, para os fantasmas), `updatedAt`. `Movie.collectionId` aponta para ela (`belongs_to_collection` do TMDb; `ON DELETE SET NULL`).
- 3.6-A.2. Preenchimento: `ensureMovie` grava a coleção na primeira vez que um filme dela entra no cache; `npm run movies:backfill-i18n` renova filmes e coleções.

## **3.6-B. Entidade: TraktList (Lista oficial do Trakt)**

- _Objetivo: cache das listas oficiais do Trakt (curadoria: box sets, filmografias, estúdios), exibidas como coleções (§6.8.5)._
- 3.6-B.1. Campos: `id` (Int, = ID do Trakt), `slug`, `name`, `description` (nula se repete o nome), `partIds` (IDs do TMDb, por lançamento; índice GIN para `hasSome`), `parts` (JSON no formato de `Collection.parts`, só com o título em inglês do Trakt), `updatedAt`. `Movie.imdbId` e `Movie.traktCheckedAt` (nulo = ainda não verificado) controlam a descoberta.

## **3.7. Entidade: ListMovie (Tabela Pivô)**

- 3.7.1. Campos: `position` (Int — ordem do filme na lista, permite reordenação), `note` (texto opcional), `addedAt`.
- 3.7.2. Chave Primária Composta: `@@id([listId, movieId])` — o mesmo filme não entra duas vezes na mesma lista.

## **3.8. Entidade: Review (Resenha)**

- _A nota fica na `LibraryEntry`/`DiaryEntry`. A `Review` é o texto público do usuário sobre o filme, alvo das interações sociais._
- 3.8.1. Campos: `id` (UUID), `content` (texto), `containsSpoilers` (Boolean), `createdAt`, `updatedAt`.
- 3.8.2. Constraint: `@@unique([userId, movieId])` — uma review por usuário por filme.

## **3.9. Entidades Sociais**

- 3.9.1. `Follow`: `followerId`, `followingId`, `createdAt`. PK composta `@@id([followerId, followingId])`.
- 3.9.2. `ReviewLike` e `ListLike`: `userId` + `reviewId`/`listId`, `createdAt`. PK composta.
- 3.9.3. `Comment`: comentário em uma review. `id`, `userId`, `reviewId`, `content`, `createdAt`, `updatedAt`.
- 3.9.4. Feed de atividades: **não** terá tabela própria inicialmente; é derivado das entradas de diário, reviews e listas públicas dos usuários seguidos.

## **3.10. Entidade: CatalogEntry (Catálogos do TMDb)**

- _Objetivo: guardar quais filmes estão em cada catálogo (Populares, Em Cartaz) e em qual ordem, alimentado pelo cron (ver 4.4)._
- 3.10.1. Campos: `type` (`POPULAR` | `NOW_PLAYING`), `position` (Int), `movieId`, `syncedAt`.
- 3.10.2. Chave Primária Composta: `@@id([type, position])`.

## **3.11. Schema de Referência**

```prisma
enum WatchStatus {
  WANT_TO_WATCH
  WATCHED
}

enum CatalogType {
  POPULAR
  NOW_PLAYING
}

model User {
  id        String   @id @db.Uuid // = auth.users.id
  email     String   @unique
  username  String   @unique
  name      String?
  avatarUrl String?
  bio       String?
  locale    String? // "pt" | "en" | "es"; nulo = automático (§6.5)
  region    String? // ISO 3166-1; nulo = automático (§6.5)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  library     LibraryEntry[]
  diary       DiaryEntry[]
  lists       List[]
  reviews     Review[]
  comments    Comment[]
  reviewLikes ReviewLike[]
  listLikes   ListLike[]
  following   Follow[]       @relation("follower")
  followers   Follow[]       @relation("following")
}

model Movie {
  id               Int       @id // TMDb ID
  /// Título no idioma original (pode ser português, inglês, russo, chinês…) — o destaque na UI.
  originalTitle    String?
  /// ISO 639-1 do idioma original (ex.: "ja").
  originalLanguage String?
  /// Títulos traduzidos (nulo = sem tradução; a UI cai no original).
  titlePt          String?
  titleEn          String?
  titleEs          String?
  /// Pôster de cada idioma (o texto do pôster muda); o DNA do usuário tem prioridade.
  posterPt         String?
  posterEn         String?
  posterEs         String?
  logoPt           String?
  logoEn           String?
  logoEs           String?
  backdropPath     String?
  releaseDate      DateTime? @db.Date
  runtime          Int?
  /// IDs de gênero do TMDb; o nome vem traduzido no idioma de quem vê.
  genreIds         Int[]     @default([])
  directors        String[]  @default([])
  countries        String[]  @default([]) // ISO 3166-1 (ex.: "US")
  voteAverage      Float?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  libraryEntries LibraryEntry[]
  artworks       MovieArtwork[]
  diaryEntries   DiaryEntry[]
  listItems      ListMovie[]
  reviews        Review[]
  catalogEntries CatalogEntry[]
}

model LibraryEntry {
  userId     String      @db.Uuid
  movieId    Int
  status     WatchStatus
  rating     Int? // 1–10 (CHECK via SQL)
  isFavorite Boolean     @default(false)
  addedAt    DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie Movie @relation(fields: [movieId], references: [id])

  @@id([userId, movieId])
  @@index([userId, status])
}

model MovieArtwork {
  userId       String   @db.Uuid
  movieId      Int
  posterPath   String?
  backdropPath String?
  updatedAt    DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie Movie @relation(fields: [movieId], references: [id])

  @@id([userId, movieId])
}

model DiaryEntry {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  movieId   Int
  watchedAt DateTime @db.Date
  rating    Int? // 1–10 (CHECK via SQL)
  isRewatch Boolean  @default(false)
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie Movie @relation(fields: [movieId], references: [id])

  @@index([userId, watchedAt(sort: Desc)])
  @@index([userId, movieId])
}

model List {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  title       String
  description String?
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  items ListMovie[]
  likes ListLike[]

  @@index([userId])
}

model ListMovie {
  listId   String   @db.Uuid
  movieId  Int
  position Int
  note     String?
  addedAt  DateTime @default(now())

  list  List  @relation(fields: [listId], references: [id], onDelete: Cascade)
  movie Movie @relation(fields: [movieId], references: [id])

  @@id([listId, movieId])
  @@index([listId, position])
}

model Review {
  id               String   @id @default(uuid()) @db.Uuid
  userId           String   @db.Uuid
  movieId          Int
  content          String
  containsSpoilers Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user     User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie    Movie        @relation(fields: [movieId], references: [id])
  likes    ReviewLike[]
  comments Comment[]

  @@unique([userId, movieId])
  @@index([movieId, createdAt(sort: Desc)])
}

model Follow {
  followerId  String   @db.Uuid
  followingId String   @db.Uuid
  createdAt   DateTime @default(now())

  follower  User @relation("follower", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followingId])
}

model ReviewLike {
  userId    String   @db.Uuid
  reviewId  String   @db.Uuid
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@id([userId, reviewId])
}

model ListLike {
  userId    String   @db.Uuid
  listId    String   @db.Uuid
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  list List @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@id([userId, listId])
}

model Comment {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  reviewId  String   @db.Uuid
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@index([reviewId, createdAt])
}

model CatalogEntry {
  type     CatalogType
  position Int
  movieId  Int
  syncedAt DateTime    @default(now())

  movie Movie @relation(fields: [movieId], references: [id])

  @@id([type, position])
}
```

# **4. Integração com a API do TMDb (The Movie Database)**

## **4.1. Configuração e Segurança**

- 4.1.1. Credenciais: armazenar o _Read Access Token_ (v4) estritamente no `.env`.
- 4.1.2. Isolamento (Server-Only): usar `$env/static/private` para que o token nunca vaze para o cliente. Chamadas ao TMDb ocorrem exclusivamente no backend.
- 4.1.3. Camada de Serviço: arquivo centralizado `src/lib/server/tmdb.ts` com funções utilitárias (`searchMovies`, `getMovieDetails`, `getPopular`, `getNowPlaying`) encapsulando o `fetch` base com URL e cabeçalhos de autorização.
- 4.1.4. Atribuição: exibir o logo e o aviso de atribuição do TMDb no site (ex.: rodapé), conforme exigido pelos termos de uso da API.

## **4.2. Endpoints Essenciais**

- 4.2.1. Busca por Texto (`/search/movie`): aceita termo de busca e paginação.
- 4.2.2. Detalhes do Filme (`/movie/{movie_id}`): com `append_to_response=credits,videos` para trazer dados principais, elenco e trailers em uma única requisição.
- 4.2.3. Catálogos: `/movie/popular` e `/movie/now_playing` para a Landing Page (`/`).
- 4.2.4. Idioma e região (§6.5): toda chamada recebe `{ locale, region }` de `event.locals`. `language` = pt-BR, en-US ou es-MX; catálogos (`popular`, `now_playing`) usam `region`; detalhes trazem `release_dates` para a estreia na região do usuário. O cache em memória separa as respostas por idioma/região.

## **4.3. Otimização e Tipagem de Dados**

- 4.3.1. Tipagem Estrita: `types` exatos para as respostas do TMDb (ex.: `TMDbMovie`, `TMDbMovieDetail`), descartando campos não utilizados.
- 4.3.2. Fluxo de Integração com o Banco: quando o usuário interagir com um filme (biblioteca, diário, lista ou review), o sistema faz _upsert_ dos metadados do filme (ver 3.3.1) na tabela `Movie`, por meio de uma função única (ex.: `ensureMovie(tmdbId)` em `src/lib/server/movies.ts`).
- 4.3.3. Caching: configurar o `fetch` de `tmdb.ts` para aproveitar cache HTTP em dados que mudam pouco (detalhes, créditos).

## **4.4. Pipeline de Ingestão de Dados (Cron Jobs)**

- 4.4.1. Ingestão em Background: rotina diária via **Vercel Cron** buscando os catálogos "Populares" e "Em Cartaz".
- 4.4.2. Sincronização Local: em uma transação Prisma, fazer _upsert_ dos filmes em `Movie` e substituir as entradas do respectivo `CatalogType` em `CatalogEntry`.
- 4.4.3. Endpoint do Cron: `src/routes/api/cron/sync-catalogs/+server.ts`, protegido pelo cabeçalho `Authorization: Bearer ${CRON_SECRET}` enviado pela Vercel.
- 4.4.4. Otimização da Landing Page: a rota `/` consome os catálogos do banco local (`CatalogEntry` + `Movie`), com respostas na casa dos milissegundos. Até o cron existir (ver seção 8), a `/` pode consultar o TMDb diretamente com cache.

# **5. Desenvolvimento do Backend (Regras de Negócio e Server-Side)**

## **5.1. Autenticação, Sessões e Segurança (Supabase Auth)**

- 5.1.1. Middleware (`hooks.server.ts`): configurar o `@supabase/ssr` para criar um cliente Supabase no servidor a cada requisição. Validar o usuário com `supabase.auth.getClaims()` (verifica a assinatura do JWT; `getSession()` sozinho não é confiável no servidor) e injetá-lo em `event.locals.user`.
- 5.1.2. Proteção de Rotas: centralizada no `hooks.server.ts` (`authGuard`), que cobre `load`, _actions_ e endpoints. Rotas protegidas (`/dashboard`, `/diary`, `/lists`, `/feed`) redirecionam para `/login?next=<rota>`; usuários logados em `/login` ou `/signup` vão para `/dashboard`. O `next` é sanitizado contra _open redirect_ (`safeRedirectPath`).
- 5.1.2.1. Login: e-mail/senha e Google (OAuth com PKCE), ambos via Form Actions em `/login`. Cadastro em `/signup` envia o `username` em `raw_user_meta_data`, lido pelo trigger. Logout é um POST para `/logout`. Recuperação de senha: `/forgot-password` chama `resetPasswordForEmail` com `redirectTo` = `/auth/callback?next=/reset-password` (sempre a mesma resposta, exista ou não a conta); o callback troca o código por sessão e abre `/reset-password` (protegida; também acessível por "Alterar senha" em `/settings`), que chama `updateUser({ password })`. Link vencido/usado volta para `/forgot-password?expired=1`. Sem domínio próprio, os e-mails saem pelo SMTP padrão do Supabase (poucos por hora, podem cair no spam); com domínio, trocar por SMTP próprio (ex.: Resend).
- 5.1.3. Sincronização Supabase → Prisma: um **trigger no Postgres** (`AFTER INSERT ON auth.users`), criado via SQL em uma migração, insere o registro correspondente em `public."User"` com o mesmo `id`. O `username` vem de `raw_user_meta_data->>'username'` (informado no cadastro) ou, na ausência, é gerado a partir do e-mail com sufixo aleatório.
- 5.1.4. Callback de OAuth / confirmação de e-mail: `src/routes/auth/callback/+server.ts` (troca do código por sessão).
- 5.1.5. Acesso ao banco: o Prisma conecta com um papel que ignora o RLS do Supabase. Portanto, **toda** checagem de autorização (dono da lista, lista pública/privada) deve ser feita explicitamente no servidor. Habilitar RLS sem políticas nas tabelas `public` para bloquear o acesso pela API REST do Supabase com a chave anon.

## **5.2. Operações CRUD via Form Actions (Mutações)**

- _Diretiva: interações da UI **não** usam endpoints de API (`+server.ts`); todas as submissões usam `export const actions` em `+page.server.ts`. Exceções permitidas: callback de autenticação (5.1.4), endpoint do cron (4.4.3) e endpoints **somente leitura** de paginação (ex.: `GET /api/search`, usado pela rolagem infinita)._
- 5.2.1. Identidade: o `userId` **nunca** vem de campos do formulário (_hidden inputs_); é sempre extraído de `event.locals.user`.
- 5.2.2. Biblioteca: actions `setStatus`, `rate` (1–10), `toggleFavorite` e `removeFromLibrary`.
- 5.2.3. Diário: actions `logWatch` (cria `DiaryEntry` e faz _upsert_ da `LibraryEntry` como `WATCHED`, atualizando a nota atual se informada), `updateDiaryEntry` e `deleteDiaryEntry`.
- 5.2.4. Listas: `createList`, `updateList`, `deleteList`, `addToList`, `removeFromList` e `reorderList` (em `$lib/server/lists`; toda mutação confere o dono). Remover fecha o buraco na numeração; `reorderList` só aceita uma permutação exata dos filmes da lista. Nos detalhes do filme: actions `toggleList` (marca/desmarca) e `quickList` (cria coleção privada já com o filme).
  - Fluxo `addToList`: (1) recebe `listId` e `tmdbId`; (2) valida que a lista pertence ao usuário; (3) `ensureMovie(tmdbId)`; (4) cria o `ListMovie` com `position` = última posição + 1.
- 5.2.5. Reviews e Social: `upsertReview`, `deleteReview`, `toggleReviewLike`, `toggleListLike`, `addComment`, `deleteComment`, `follow`, `unfollow`.
- 5.2.6. Progressive Enhancement: formulários com `use:enhance` para evitar recarregamento total da página.

## **5.3. Validação de Dados e Tratamento de Erros**

- 5.3.1. Validação com Zod: validar o `FormData` recebido nas actions (ex.: `rating` inteiro entre 1 e 10, `watchedAt` não futura).
- 5.3.2. `sveltekit-superforms`: conectar o schema Zod do backend ao frontend (base dos formulários do Shadcn-Svelte), gerenciando erros e estados de envio.
- 5.3.3. Falhas de Regra de Negócio: retornar com `fail(400, { form })` para devolver o estado de erro ao frontend.

# **6. Desenvolvimento do Frontend (UI, Roteamento e Estados)**

## **6.1. Estrutura de Rotas e Páginas (SvelteKit)**

- 6.1.1. `/` (Pública): Landing Page com os catálogos Populares e Em Cartaz.
- 6.1.2. `/login`, `/signup` e `/forgot-password` (só visitantes) e `/reset-password` (logado): autenticação via Supabase (§5.1.2.1).
- 6.1.3. `/search` (pública, dentro do layout da área logada): busca orientada a URL (`/search?q=batman`), com busca enquanto digita (debounce) e link compartilhável. Sem termo, mostra os filmes em alta. O `load` entrega a 1ª página; as seguintes vêm de `GET /api/search?q=&page=` via rolagem infinita. Mesmo card da biblioteca; no canto superior esquerdo, o botão **+** adiciona como "Quero ver" (action `?/add`); filmes já na biblioteca mostram o estado; visitantes são levados ao login com `next`.
- 6.1.4. `/movie/[id]`: detalhes do filme via SSR (SEO), layout inspirado na referência "Joker": backdrop em tela cheia nas cores originais (fixo no tamanho da tela), título grande (a **logo** do TMDb quando houver — padrão no idioma original, depois no de quem vê, depois em inglês; logos pretas/cinza-escuras aparecem em branco; sem logo, o título em texto) e quatro abas. **Sobre** (sinopse completa; no desktop cabe numa tela só); **Elenco** (Direção, Roteiro e Elenco com fotos, em carrosséis horizontais); **Galeria** (fundos, pôsteres e logos de todos os idiomas, carregados sob demanda por `GET /api/movie/[id]/images`; escolher uma imagem salva o DNA do filme, §3.4-A). Fora do Sobre, a linha de dados e a frase do filme somem com animação; na Galeria o título sobe para o topo. Coluna lateral: estreia, país, gênero, estúdio, música, os controles da biblioteca (indicador estático do estado — vem do diário, §3.4.3; fora da biblioteca, botão para adicionar em Quero ver; nota em 10 estrelas com o favorito ao lado) e o trailer. O diário abre num pop-up ao lado do botão "Registrar sessão" (painel inferior no celular), com data em dd/mm/aaaa. Actions: `add`, `remove`, `rate`, `favorite`, `logSession`, `deleteSession`, `artwork` (nota/favorito só para assistidos, §3.4.4). Ao clicar num card em qualquer tela, abre **por cima** da página atual via _shallow routing_ (`pushState` + `preloadData`); a URL muda para `/movie/[id]`, Esc/voltar fecha, e o link direto abre a página completa. Depois de cada action o painel atualiza a cópia dos dados guardada no histórico (`replaceState`) e recarrega a página de baixo com `refreshAll()` — **não** usar `invalidateAll()`, que zera `page.state` e fecha o painel. Reviews da comunidade entram na Fase 3.
- 6.1.5. `/dashboard` (Protegida): carrossel com 8 filmes aleatórios da própria biblioteca, diário recente, métricas (assistidos, horas, nota média com histograma, quero ver), sessões por mês e gêneros; e a **biblioteca do usuário em grade**, com abas (todos, assistidos, quero ver, favoritos — os ícones das abas servem de legenda dos selos dos pôsteres), filtro de gênero e ordenação (lançamento — padrão, do mais antigo ao mais novo —, adicionados, nota, título, aleatório), cada uma com direção crescente/decrescente, tudo refletido na URL (`view`, `genre`, `sort`, `dir`). Cards: "título · ano" e "diretor · país · duração". Ao clicar num card, abre um painel/modal com informações técnicas e o diário do filme (com link para `/movie/[id]`).
- 6.1.6. `/diary` (Protegida): diário completo, **sempre ordenado pela data assistida** (mais recente primeiro; sem outras ordenações). Visual do dashboard (resumo em cartões: sessões, sessões no ano, filmes diferentes, revistos) com divisões claras por **ano** (atalhos no topo) e **mês** (título fixo à esquerda no desktop). Cada sessão é um card de pôster com o dia em destaque e selos de anotação/revisto/favorito. O clique **não** abre o filme: abre um painel lateral do registro (data e dia da semana, qual vez foi e quanto tempo depois da anterior, nota em 10 estrelas, anotação, "você e o filme" — vezes, nota atual, favorito, primeira e última vez — e todas as datas em que o filme foi visto), com "Apagar sessão" e o botão "Ver filme", que abre os detalhes por cima (§6.1.4).
- 6.1.7. `/lists` (Protegida): listas do usuário em cards largos com o **fundo do 1º filme** (DNA visual do dono) e o título grande por cima, tipo, visibilidade e nº de filmes; "Nova lista" abre um modal (título, descrição, Ranking/Coleção, Privada/Pública).
- 6.1.7-A. `/lists/[id]`: destaque com o fundo do 1º filme, título, descrição e dono; grade de pôsteres (cards da biblioteca, com o estado de quem vê). Ranking: números grandes e, no modo edição do dono, reordenar arrastando ou com setas (salva na hora). Coleção: quem vê ordena por adição, lançamento ou título original. Modo edição: remover filmes, editar dados e apagar a lista. **Públicas abrem para qualquer pessoa (inclusive sem conta)** e têm "Copiar link"; privadas de outra pessoa respondem 404 (sem revelar que existem). Só `/lists` exato exige login no hook.
- 6.1.7-B. Nos detalhes do filme, o botão "Listas" (mostra "Em N listas") abre um pop-up ao lado, igual ao do diário, com as listas marcáveis e a criação rápida.
- 6.1.7-C. `/lists` tem duas divisões (aba na URL, `?tab=collections`): **Listas** (criadas pelo usuário) e **Coleções** (sagas do TMDb, §6.8). Para não confundir, o tipo de lista sem números se chama **Livre** (o enum continua `COLLECTION`).
- 6.1.8. `/list/[id]`: lista pública ou privada (conforme `isPublic`); se privada, apenas o dono acessa.
- 6.1.9. `/u/[username]`: perfil (aberto a visitantes): avatar, nome, @, bio, desde quando, números (assistidos, reviews, listas, seguidores, seguindo) e Seguir/Deixar de seguir (ou "Editar perfil" no próprio). Seções: favoritos, assistiu recentemente (datas e notas — **anotações do diário nunca aparecem**), reviews e listas públicas. Perfil privado de outra pessoa: só cabeçalho, números e listas públicas.
- 6.1.10. `/feed` (Protegida): sessões assistidas por quem o usuário segue (perfis privados ficam de fora; sem anotações), agrupadas por dia (Hoje/Ontem/data), com pôster, título original e traduzido, nota e quando foi registrada. Feed vazio leva à busca de pessoas.
- 6.1.11. `/settings/import` (Protegida): importador do Letterboxd (§6.7).

## **6.6. Comunidade**

- 6.6.1. Reviews: aba **Reviews** nos detalhes do filme (uma review por pessoa por filme; escrever, editar, apagar, marcar spoiler). As da comunidade vêm de quem o usuário segue primeiro, depois as mais curtidas. Spoiler fica borrado até "Mostrar mesmo assim". Curtir (não a própria) e comentar (apaga quem escreveu o comentário ou o autor da review). Leitura por `GET /api/movie/[id]/reviews` e `GET /api/reviews/[id]/comments` (exceção só leitura, §5.2); mutações em actions de `/movie/[id]` (`review`, `deleteReview`, `likeReview`, `comment`, `deleteComment`).
- 6.6.2. Privacidade: `User.isPrivate` (em `/settings`, junto de nome e bio). Privado esconde diário, favoritos e reviews dos outros e tira a pessoa do feed de quem a segue; listas públicas continuam públicas.
- 6.6.3. Busca de pessoas: alternância Filmes/Pessoas em `/search` (`?type=people`), por @username ou nome, com Seguir na própria lista.

## **6.2. Arquitetura de Componentes e UI**

- _Diretiva Crítica: sob nenhuma hipótese usar paradigmas do React (`useState`, `useEffect`, `className`). Usar estritamente Svelte 5: `class=`, Runes (`$state`, `$derived`, `$effect`, `$props`) e blocos `{#if}`/`{#each}`._
- 6.2.1. Componentes Base (Shadcn-Svelte): gerados em `src/lib/components/ui/`.
- 6.2.2. Integração Rewamp UI: traduzir estrutura HTML/Tailwind e lógica para componentes Svelte nativos.
- 6.2.3. Integração Hallmark: adaptar imediatamente qualquer código React gerado para Svelte, mantendo visual e classes Tailwind intactos.
- 6.2.4. Tradução React → Svelte: todo componente vindo do ecossistema React (Next.js, Framer Motion) deve ter hooks de ciclo de vida e estado reimplementados com Runes, e animações substituídas por `svelte/motion` / `svelte/transition`, preservando as classes Tailwind. _(Pendente: a skill "Svelte UI Translator" ainda precisa ser criada ou importada para o ambiente.)_

## **6.3. Gerenciamento de Estado (Client-Side)**

- 6.3.1. Reatividade Local: Runes (`$state`, `$derived`) para abas, filtros temporários e modais.
- 6.3.2. Sincronização de URL: estados que afetam os dados exibidos (paginação, busca, filtros e ordenação da grade) ficam na URL, não só na memória do componente.
- 6.3.3. Compartilhamento Global: estado compartilhado entre componentes distantes (ex.: player de trailer global) em módulos `.svelte.ts` com Runes, usando a Context API (`setContext`/`getContext`) quando o estado for por requisição/usuário, para evitar vazamento de estado entre usuários no SSR.

## **6.4. UX, Feedback Visual e Interatividade**

- 6.4.1. Loading States: usar `navigating` de `$app/state` para indicadores globais de carregamento e Skeletons do Shadcn-Svelte nas páginas.
- 6.4.2. Mutações (`use:enhance`): todos os formulários que alteram o banco usam `use:enhance`, com _Optimistic UI_ onde fizer sentido (ex.: favoritar, marcar como assistido, dar nota).
- 6.4.3. Notificações: toasts via **svelte-sonner** (o Sonner do Shadcn-Svelte), montado no layout raiz, para sucesso/falha (ex.: "Adicionado a “Melhores do ano”", "Nota salva: 8/10"). Falhas de validação de campo ficam no próprio formulário; mensagens da action e erros inesperados viram toast.
- 6.4.4. Toda mutação passa por `withFeedback` (`$lib/feedback/submit`): trava o formulário enquanto envia (botões desativados, `aria-busy`; clique duplo/Enter repetido é ignorado), pergunta antes das ações destrutivas (`confirmAction`, diálogo do app em vez do `confirm()` do navegador — remover da biblioteca, apagar sessão/review/comentário/lista, tirar filme da lista) e mostra o toast. Com a confirmação aberta, pop-ups e modais por baixo ignoram Esc e "clique fora".
- 6.4.5. Na página direta `/movie/[id]` as actions não recarregam a página (a resposta já traz o estado); só o painel sobreposto chama `refreshAll()` para atualizar a página de baixo — evita que o recarregamento lento de uma ação sobrescreva a seguinte.

## **6.5. Idiomas e Região (i18n)**

- 6.5.1. Idiomas: **português (base), inglês e espanhol (América Latina)**, com **Paraglide JS** (`messages/{pt,en,es}.json`). Menus, textos, mensagens de validação e erros do servidor são traduzidos. Rótulos usados fora de componentes (navegação, ordenações, abas) são **funções**, nunca constantes de módulo — no servidor, uma constante ficaria presa ao idioma da primeira requisição. Mensagens do Zod usam `error: () => m.chave()`.
- 6.5.2. Escolha do idioma: sem prefixo na URL. Ordem: cookie `locale` → idioma do navegador → pt. A região é independente: cookie `region` → país do `Accept-Language` → padrão do idioma (pt→BR, en→US, es→MX). O hook `i18n` resolve os dois, grava os cookies na primeira visita e expõe `locals.locale`/`locals.region`; `<html lang>` acompanha.
- 6.5.3. Preferências: `/settings` (logado) e o seletor de idioma do rodapé/telas de login (visitantes) enviam para `POST /preferences`, que grava cookies e, se logado, `User.locale`/`User.region`, e recarrega a página. No login (senha, Google, cadastro) o perfil vale para outros dispositivos; o que o perfil não tem é preenchido com o que o navegador já usa.
- 6.5.4. Títulos: **o original em destaque e, embaixo, a tradução** no idioma de quem vê (cards, detalhes, diário, carrosséis); a linha da tradução existe sempre nos cards para manter a grade alinhada. Onde há **logo** do TMDb (página do filme e carrossel de sugestões do dashboard), ela substitui o título original e o título em texto fica embaixo; na página do filme, o título original e o traduzido ficam no topo da barra lateral (a logo pode estar em outro idioma). Os cards de pôster (biblioteca, listas, perfil, busca) e o diário seguem em texto. A biblioteca ordena por título original.
- 6.5.5. Formatação: datas, meses, nomes de países e de idiomas via `Intl` no idioma atual (`$lib/format`). O campo de data do diário segue o idioma (pt/es dd/mm/aaaa; en mm/dd/yyyy).

## **6.7. Importar do Letterboxd**

- 6.7.1. Entrada: o .zip de Settings → Data → Export Your Data do Letterboxd, lido **no navegador** (`fflate` + leitor de CSV próprio em `$lib/import`). Pastas `deleted/` e `orphaned/` são ignoradas.
- 6.7.2. Mapeamento: `diary.csv` → sessões (data assistida, nota ×2 na escala de 10, rewatch); o texto de `reviews.csv` da mesma sessão vira a anotação (até 500 caracteres) e a review mais recente de cada filme vira a review da comunidade (só se ainda não houver). `watched.csv` sem sessão → uma sessão na data em que foi marcado (Assistido exige diário, §3.4.3). `ratings.csv` → nota atual; `likes/films.csv` → favorito (só assistidos); `watchlist.csv` → Quero ver; `lists/*.csv` → listas privadas, tipo coleção, na ordem original. Como o diário e as reviews trazem o URI da sessão (não do filme), a chave é nome + ano.
- 6.7.3. Envio em lotes por Form Actions da página (`resolve` → `films` → `list`, JSON no campo `payload`): nome + ano → ID do TMDb (`findMovieId`: ano exato, depois lançamento no ano, ano vizinho), depois biblioteca/diário/reviews e por fim as listas (em partes de 50 filmes). Cada chamada é curta (limite de tempo da Vercel) e repetível: sessões na mesma data são ignoradas; nota, favorito e review existentes são mantidos; lista com o mesmo nome é completada em vez de duplicada. Filmes não encontrados aparecem no fim, com link para a busca.

## **6.8. Coleções do TMDb**

- 6.8.1. Aba **Coleções** em `/lists`: uma por saga com pelo menos um filme na biblioteca do usuário, com o fundo da coleção, o nome no idioma de quem vê e o progresso ("3 de 8", barra que fica rosa ao completar). Ordem: as mais completas primeiro.
- 6.8.2. `/lists/collections/[id]` (Protegida): os filmes da coleção que estão na biblioteca, com o estado de cada um, e os que faltam como **fantasmas** (apagados e sem cor; ganham cor ao passar o mouse; o "+" adiciona em Quero ver e a página recarrega). **Não se edita** (nada a remover ou arrastar): filtros Todos/Assistidos/Quero ver/Favoritos/Faltam e ordenação (ordem da saga — padrão —, título, sua nota, última vez assistido), sem salvar. Na ordem da saga os fantasmas ficam intercalados pela data de lançamento; nas outras, vão para o fim, também por lançamento.
- 6.8.5. **Listas oficiais do Trakt** (`TRAKT_CLIENT_ID`; ausente = desligado): descobertas por filme (`GET /movies/:imdb/lists/official`, com os itens de cada lista nova em `GET /lists/:id/items/movie?extended=full`). Para respeitar o limite do Trakt (~1000 chamadas/5 min), a descoberta **não** acontece ao adicionar filmes: a aba Coleções chama a action `syncTrakt` em lotes (até ~8 s cada, filmes mais recentes primeiro) até verificar toda a biblioteca, pausando quando o Trakt pede (`Retry-After`). Na aba, um filtro separa Sagas · TMDb e Listas oficiais · Trakt. Listas do Trakt com 80%+ dos filmes de uma saga do TMDb (ex.: "Toy Story Collection") ou de outra lista do Trakt não aparecem. Página: `/lists/collections/trakt/[id]`, igual à das sagas; o fundo é o do 1º filme da lista que o usuário tem, e os fantasmas buscam pôster e título traduzido em `GET /api/movie/[id]/card` quando entram na tela.
- 6.8.4. Escopo: são as coleções do TMDb (`belongs_to_collection`), que por regra do TMDb só agrupam franquias/sequências. Filmografias de diretor, box sets de estúdio e curadorias (ex.: listas oficiais do Trakt) não existem como coleção no TMDb.
- 6.8.3. Detalhes do filme: o campo **Coleção** na barra lateral leva à coleção (logado).

# **7. Deploy, Infraestrutura e CI/CD**

## **7.1. Configuração de Build (Vercel + SvelteKit)**

- 7.1.1. Adapter: `@sveltejs/adapter-vercel` no `svelte.config.js`.
- 7.1.2. Runtime: Serverless Functions padrão (Node.js). Não usar o Edge Runtime.

## **7.2. Gerenciamento do Prisma no Ambiente Serverless**

- _Diretiva Crítica: o Prisma em ambientes serverless esgota as conexões do banco rapidamente se não for bem configurado._
- 7.2.1. Connection Pooling: usar o Supavisor (pooler do Supabase) em modo _transaction_ para as queries da aplicação.
- 7.2.2. Duas URLs de banco:
  - `DATABASE_URL`: URL do pooler, usada pela aplicação em runtime.
  - `DIRECT_URL`: URL direta do banco, usada exclusivamente pelas migrações.
  - A forma de declarar essas URLs muda entre versões do Prisma (as versões recentes usam `prisma.config.ts` e _driver adapters_ em vez de `url`/`directUrl` no `schema.prisma`). Seguir a documentação da versão instalada no momento do setup.
  - _Implementado (Prisma 7.10.0, versões fixadas):_ `prisma.config.ts` usa `DIRECT_URL` para o CLI; `src/lib/server/db.ts` usa `DATABASE_URL` via `@prisma/adapter-pg`. O client é gerado em `src/lib/server/generated/prisma` (ignorado pelo git).
- 7.2.3. Instância única: exportar o Prisma Client de `src/lib/server/db.ts` como singleton.
- 7.2.4. Fluxo de migrações: o `prisma migrate dev` não funciona através do pooler do Supabase (a _shadow database_ não é roteável). Para criar uma migração:
  1. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o prisma/migrations/<timestamp>_<nome>/migration.sql`
  2. Revisar o SQL (e acrescentar SQL manual, se necessário).
  3. `npm run db:deploy` para aplicar.
  - A migração `init` contém SQL manual: CHECK constraints, triggers de sincronização `auth.users` → `public."User"` e RLS habilitado em todas as tabelas.
- 7.2.5. Script de Build: garantir que o Prisma Client seja gerado antes do build: `"build": "prisma generate && vite build"`.

## **7.3. Variáveis de Ambiente e Segurança**

- 7.3.1. Ambientes: chaves do TMDb, URLs do Supabase/banco e `CRON_SECRET` configuradas no painel da Vercel para _Preview_ e _Production_.
- 7.3.2. Prefixo `PUBLIC_`: somente o que o cliente realmente precisa (URL do Supabase e chave anon). Token do TMDb, URLs do banco, `CRON_SECRET` e a service role key do Supabase permanecem privados.
- 7.3.3. Um `.env.example` versionado lista todas as variáveis necessárias (sem valores reais); o `.env` nunca é commitado.

## **7.4. Fluxo de Trabalho e CI/CD (GitHub)**

- 7.4.1. Gestão de Tarefas: **GitHub Projects** (Kanban).
- 7.4.2. GitHub Actions (a cada Pull Request para a `main`):
  - Checagem de tipos (`svelte-check`).
  - Linting e formatação (ESLint + Prettier).
  - Validação do schema (`prisma validate`).
  - Testes unitários (Vitest) nas regras de negócio de `src/lib/server/`.
- 7.4.3. Deploy Automático: ao fazer merge ou _push_ na `main`, a Vercel instala as dependências, roda o `prisma generate` e publica o site. As migrações de produção (`prisma migrate deploy`) rodam em etapa controlada, não automaticamente a cada build de preview.
- 7.4.4. Estado atual: repositório público `teixeiralucs/super-eight`; projeto Vercel `super-eight` (time `lulu27`) ligado ao GitHub — todo push na `main` publica em **https://super-eight-liart.vercel.app**. Produção usa o **mesmo projeto Supabase** do desenvolvimento (decisão consciente; separar depois). Variáveis na Vercel (Production e Preview): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `TMDB_READ_ACCESS_TOKEN` (`CRON_SECRET` entra com o cron). `npm ci` roda `svelte-kit sync` antes do `prisma generate` (o Prisma lê o `tsconfig.json`, que estende `.svelte-kit/tsconfig.json`). Os testes de componente fixam o idioma em pt (o navegador do CI é em inglês).
