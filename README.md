# Super Eight

Seu diário de cinema: registre, avalie e organize os filmes que você assiste — biblioteca,
diário, listas e comunidade, em português, inglês e espanhol.

A especificação completa (modelo de dados, regras de negócio, rotas e decisões) está em
[`earlySetup.md`](earlySetup.md).

## Stack

- **SvelteKit 2 + Svelte 5** (runes), **Tailwind CSS v4**, componentes no estilo shadcn-svelte
- **Supabase** (Auth e Postgres) com **Prisma 7**
- **TMDb** para dados e imagens dos filmes
- **Paraglide JS** para i18n (pt, en, es-MX)
- Deploy na **Vercel** (adapter-vercel, Node 24)

## Rodando localmente

Requisitos: Node 24 e um projeto no Supabase.

```bash
npm ci
cp .env.example .env   # preencha as variáveis (veja os comentários no arquivo)
npm run db:deploy      # aplica as migrações
npm run dev
```

## Scripts úteis

| Comando                                     | O que faz                                                     |
| ------------------------------------------- | ------------------------------------------------------------- |
| `npm run check`                             | compila as mensagens e checa tipos (svelte-check)             |
| `npm run lint`                              | Prettier + ESLint                                             |
| `npm test`                                  | testes (Vitest: servidor e componentes no Chromium)           |
| `npm run build` / `npm run preview`         | build de produção e prévia local                              |
| `npm run db:deploy`                         | aplica migrações pendentes (ver `earlySetup.md` §7.2.4)       |
| `npm run movies:backfill-i18n`              | (re)preenche títulos e pôsteres traduzidos do cache de filmes |
| `npm run library:backup -- <username>`      | exporta a biblioteca de um usuário para `backups/`            |
| `npm run library:restore -- <arquivo.json>` | restaura um backup                                            |

## Créditos

Dados e imagens de filmes fornecidos pelo [TMDB](https://www.themoviedb.org/). Este produto usa
a API do TMDB, mas não é endossado nem certificado pelo TMDB.
