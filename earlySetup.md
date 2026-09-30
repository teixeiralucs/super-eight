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
- 3.3.1. Campos: `id` (Int, = ID do TMDb), `title`, `originalTitle`, `overview`, `posterPath`, `backdropPath`, `releaseDate`, `runtime`, `genres` (array de nomes), `voteAverage`, `createdAt`, `updatedAt` (data da última sincronização).
- 3.3.2. Informações técnicas mais pesadas (elenco, equipe, trailers) **não** são persistidas: são buscadas no TMDb sob demanda, com cache HTTP (ver 4.3.3).

## **3.4. Entidade: LibraryEntry (Biblioteca / Lista Principal)**

- _Objetivo: representar o **estado atual** da relação entre um usuário e um filme. É a fonte da grade do `/dashboard`._
- 3.4.1. Campos: `status` (`WANT_TO_WATCH` | `WATCHED`), `rating` (Int 1–10, opcional — nota atual do usuário), `isFavorite` (Boolean), `addedAt`, `updatedAt`.
- 3.4.2. Chave Primária Composta: `@@id([userId, movieId])` — um filme aparece uma única vez na biblioteca de um usuário.
- 3.4.3. Regra de negócio: registrar uma entrada no diário faz _upsert_ da `LibraryEntry` com status `WATCHED`.
- 3.4.4. Regra de negócio: **só filmes assistidos (`WATCHED`) podem ter nota ou ser favoritos.** Garantida no banco por `CHECK` (`LibraryEntry_rating_favorite_require_watched_check`) e validada nas _actions_. Voltar um filme para `WANT_TO_WATCH` deve limpar nota e favorito.

## **3.5. Entidade: DiaryEntry (Diário)**

- _Objetivo: registrar **cada sessão** em que o usuário assistiu um filme (permite rewatches)._
- 3.5.1. Campos: `id` (UUID), `watchedAt` (Date), `rating` (Int 1–10, opcional — nota daquela sessão), `isRewatch` (Boolean), `note` (texto opcional), `createdAt`, `updatedAt`.
- 3.5.2. Chaves Estrangeiras: `userId`, `movieId`.
- 3.5.3. Índice: `(userId, watchedAt desc)` para montar o diário cronológico.

## **3.6. Entidade: List (Lista Personalizada)**

- 3.6.1. Campos: `id` (UUID), `title`, `description` (opcional), `isPublic` (Boolean, default `false`), `createdAt`, `updatedAt`.
- 3.6.2. Chave Estrangeira: `userId`.
- 3.6.3. Relacionamentos: vários filmes (NxN via `ListMovie`) e likes.

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
  id            Int       @id // TMDb ID
  title         String
  originalTitle String?
  overview      String?
  posterPath    String?
  backdropPath  String?
  releaseDate   DateTime? @db.Date
  runtime       Int?
  genres        String[]
  voteAverage   Float?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  libraryEntries LibraryEntry[]
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
- 4.2.4. Idioma: enviar `language=pt-BR` nas requisições (com fallback para o título original quando não houver tradução).

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
- 5.1.2.1. Login: e-mail/senha e Google (OAuth com PKCE), ambos via Form Actions em `/login`. Cadastro em `/signup` envia o `username` em `raw_user_meta_data`, lido pelo trigger. Logout é um POST para `/logout`.
- 5.1.3. Sincronização Supabase → Prisma: um **trigger no Postgres** (`AFTER INSERT ON auth.users`), criado via SQL em uma migração, insere o registro correspondente em `public."User"` com o mesmo `id`. O `username` vem de `raw_user_meta_data->>'username'` (informado no cadastro) ou, na ausência, é gerado a partir do e-mail com sufixo aleatório.
- 5.1.4. Callback de OAuth / confirmação de e-mail: `src/routes/auth/callback/+server.ts` (troca do código por sessão).
- 5.1.5. Acesso ao banco: o Prisma conecta com um papel que ignora o RLS do Supabase. Portanto, **toda** checagem de autorização (dono da lista, lista pública/privada) deve ser feita explicitamente no servidor. Habilitar RLS sem políticas nas tabelas `public` para bloquear o acesso pela API REST do Supabase com a chave anon.

## **5.2. Operações CRUD via Form Actions (Mutações)**

- _Diretiva: interações da UI **não** usam endpoints de API (`+server.ts`); todas as submissões usam `export const actions` em `+page.server.ts`. Exceções permitidas: callback de autenticação (5.1.4), endpoint do cron (4.4.3) e endpoints **somente leitura** de paginação (ex.: `GET /api/search`, usado pela rolagem infinita)._
- 5.2.1. Identidade: o `userId` **nunca** vem de campos do formulário (_hidden inputs_); é sempre extraído de `event.locals.user`.
- 5.2.2. Biblioteca: actions `setStatus`, `rate` (1–10), `toggleFavorite` e `removeFromLibrary`.
- 5.2.3. Diário: actions `logWatch` (cria `DiaryEntry` e faz _upsert_ da `LibraryEntry` como `WATCHED`, atualizando a nota atual se informada), `updateDiaryEntry` e `deleteDiaryEntry`.
- 5.2.4. Listas: `createList`, `updateList`, `deleteList`, `addToList`, `removeFromList` e `reorderList`.
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
- 6.1.2. `/login` e `/signup`: autenticação via Supabase.
- 6.1.3. `/search` (pública, dentro do layout da área logada): busca orientada a URL (`/search?q=batman`), com busca enquanto digita (debounce) e link compartilhável. Sem termo, mostra os filmes em alta. O `load` entrega a 1ª página; as seguintes vêm de `GET /api/search?q=&page=` via rolagem infinita. Mesmo card da biblioteca; no canto superior esquerdo, o botão **+** adiciona como "Quero ver" (action `?/add`); filmes já na biblioteca mostram o estado; visitantes são levados ao login com `next`.
- 6.1.4. `/movie/[id]`: detalhes do filme via SSR (SEO). Para o usuário logado, inclui também os controles da biblioteca, o diário com aquele filme e as reviews da comunidade.
- 6.1.5. `/dashboard` (Protegida): carrossel com 8 filmes aleatórios da própria biblioteca, diário recente, métricas (assistidos, horas, nota média com histograma, quero ver), sessões por mês e gêneros; e a **biblioteca do usuário em grade**, com abas (todos, assistidos, quero ver, favoritos — os ícones das abas servem de legenda dos selos dos pôsteres), filtro de gênero e ordenação (lançamento — padrão, do mais antigo ao mais novo —, adicionados, nota, título, aleatório), cada uma com direção crescente/decrescente, tudo refletido na URL (`view`, `genre`, `sort`, `dir`). Cards: "título · ano" e "diretor · país · duração". Ao clicar num card, abre um painel/modal com informações técnicas e o diário do filme (com link para `/movie/[id]`).
- 6.1.6. `/diary` (Protegida): diário completo em ordem cronológica.
- 6.1.7. `/lists` (Protegida): listas personalizadas do usuário (menu **Listas**).
- 6.1.8. `/list/[id]`: lista pública ou privada (conforme `isPublic`); se privada, apenas o dono acessa.
- 6.1.9. `/u/[username]`: perfil público (favoritos, atividade recente, listas públicas, seguidores/seguindo).
- 6.1.10. `/feed` (Protegida): atividade dos usuários seguidos.

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
- 6.4.3. Notificações: toasts via **Sonner** (componente oficial do Shadcn-Svelte) para sucesso/falha (ex.: "Filme adicionado à biblioteca", "Erro ao avaliar").

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

# **8. Roadmap**

- **Fase 1 — MVP**
  1. Setup do projeto (SvelteKit, Tailwind, Shadcn-Svelte, Prisma, Supabase, Vercel, CI).
  2. Autenticação (cadastro, login, trigger de sincronização do `User`).
  3. Busca (`/search`) e detalhes do filme (`/movie/[id]`).
  4. Biblioteca (`/dashboard` em grade), status, nota 1–10, favorito e diário.
  5. Listas personalizadas.
- **Fase 2 — Descoberta:** Landing Page com catálogos alimentados pelo cron (`CatalogEntry`).
- **Fase 3 — Social:** perfis públicos, follow, reviews com likes e comentários, likes em listas e feed.
- **Fase 4 — Expansão:** avaliação do suporte a séries.
