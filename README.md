![Chic.js](images/chicjs.png "Chic.js")

# Chic.js

Chic is a Rails-like CLI for SvelteKit. It creates TypeScript applications with
Drizzle and SQLite, then generates validated CRUD resources, pages, APIs, and
reversible migrations.

Requires Node.js `^22.18.0` or `>=24.11.0`.

## Quick start

```sh
npm install -g chic.js
chic new bookstore --tailwind --playwright
cd bookstore
chic generate scaffold Book title:string author:string published:boolean:index
chic db migrate
chic server --open
```

Open `/books` for the scaffold and `/__chic/routes` for the searchable route
inspector. The inspector only runs during development unless
`CHIC_DEBUG=ON` is explicitly set.

## Why Chic?

- Drizzle + SQLite by default, using the official Svelte CLI add-on
- TypeScript and Svelte 5 output
- Full CRUD pages with progressive enhancement and validation
- REST endpoints or opt-in SvelteKit remote functions
- Reversible SQL migrations, seeds, database console, and Drizzle Studio
- Atomic generation with rollback on errors
- `--dry-run`, `--force`, `--skip`, and `chic destroy`
- Project health checks and a visual route inspector
- Existing `hooks.server.ts` files are never overwritten

## Commands

### Projects

```sh
chic new my-app
chic new my-app --tailwind --auth --playwright --vitest
chic new my-app --package-manager pnpm --add eslint,prettier
chic init                         # add Chic to an existing SvelteKit app
chic init --no-install
chic upgrade --force             # adopt Drizzle metadata in a legacy project
chic doctor
```

`chic new` delegates SvelteKit and add-on setup to the tested `sv@0.17.0` CLI.
Drizzle uses SQLite with `better-sqlite3`. Additional `sv` add-ons can be
passed with `--add`.

### Generators

```sh
chic generate scaffold Post title:string body:text published:boolean
chic generate scaffold Post title:string --api=none
chic generate scaffold Post title:string --api=remote
chic generate model Comment body:text post:references
chic generate controller Comment
chic generate route /about
chic generate component ContactForm
chic generate migration AddStatusToPosts
chic generate from resources.json

chic make Post title:string       # scaffold alias
chic add /about                   # route shorthand
chic add ContactForm              # component shorthand
chic destroy scaffold Post
```

Destroy removes generated application files but preserves migration history. It
adds a reversible `drop_<table>` migration; run `chic db migrate` when you are
ready to remove the table.

All mutating generators support:

| Option | Behavior |
| --- | --- |
| `--dry-run` | Print the complete plan without writing |
| `--force` | Replace existing generated files |
| `--skip` | Keep files that already exist |

Generation is transactional: if a write fails, Chic restores every file
changed by that operation.

### Field syntax

```text
name:type:modifier,modifier
```

Types:

`string`, `text`, `integer`, `number`, `float`, `boolean`, `date`,
`datetime`, `json`, and `references`.

Modifiers:

`required` (default), `optional`, `unique`, and `index`.

Examples:

```sh
email:string:unique
published:boolean:optional,index
author:references
```

`references` creates an integer foreign-key column. Generate the referenced
model first. File uploads are intentionally not treated as plain database
fields; add a storage integration and store its resulting URL as a `string`.

### Database

```sh
chic db generate       # run drizzle-kit generate
chic db migrate        # apply pending Chic SQL migrations
chic db rollback       # revert the latest migration
chic db reset          # rollback all, then migrate
chic db seed           # run .chic/seed.mjs
chic db studio         # open Drizzle Studio
chic db console        # SQLite REPL; connection is available as `db`
```

Scaffolds create paired files under `drizzle/chic`:

```text
20260822200000_create_posts.up.sql
20260822200000_create_posts.down.sql
```

Edit `.chic/seed.mjs` to add repeatable development seed data.

### Routes and development

```sh
chic routes
chic debug status
chic debug ON
chic debug OFF
chic sitemap https://example.com
chic server
chic server --open
```

`chic sitemap` reads static page routes directly from `src/routes`; a build is
not required. Dynamic, API, route-group, and Chic development routes are
excluded.

## Configuration

`chic.json` is generated and maintained atomically:

```json
{
  "version": 2,
  "orm": "drizzle",
  "database": "sqlite",
  "models": [],
  "components": [],
  "routes": []
}
```

Models record their fields and generated artifacts so `chic destroy` can
reverse them safely. Avoid hand-editing artifact paths.

Batch generation accepts the same shape:

```json
{
  "models": [
    {
      "name": "Book",
      "api": "rest",
      "fields": [
        { "name": "title", "type": "string", "unique": true },
        { "name": "published", "type": "boolean", "required": false }
      ]
    }
  ]
}
```

Run it with `chic generate from resources.json`.

## Upgrading from Chic 1

Chic 2 changes the default ORM from Sequelize to Drizzle. Back up your
database, commit your project, and run:

```sh
chic upgrade --force
```

The command installs and configures Drizzle without deleting legacy source
files or transforming existing data. Migrate existing data explicitly, then
regenerate resources with `--force` as appropriate.

## Development

```sh
npm install
npm test
```

CI runs tests and syntax checks for every pull request. Integration tests
generate and destroy complete resources in temporary projects. When Playwright
is installed, each scaffold also includes a CRUD browser test under
`tests/chic`.

---

Copyright (c) 2025-2026 Mark Schellhas and contributors. MIT licensed.
