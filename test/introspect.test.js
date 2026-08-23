import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { buildFromDatabasePlan, namesFor } from '../lib/generator.js';
import {
  inspectDatabase,
  isSystemTable,
  mapSqlType,
  parseTableList,
  prepareScaffoldTables,
  resolveDatabasePath,
  selectTableNames,
  tableToScaffold
} from '../lib/introspect.js';

function fixture(dependencies = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chic-from-db-'));
  fs.mkdirSync(path.join(root, 'src/lib/server/db'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module', devDependencies: dependencies }));
  fs.writeFileSync(path.join(root, 'src/lib/server/db/schema.ts'), '// schema\n');
  fs.writeFileSync(path.join(root, 'chic.json'), JSON.stringify({
    version: 2,
    orm: 'drizzle',
    database: 'sqlite',
    models: [],
    components: [],
    routes: []
  }));
  return root;
}

function writeDatabase(root, sql, filename = 'chic.db') {
  const dbPath = path.join(root, filename);
  const db = new DatabaseSync(dbPath);
  db.exec(sql);
  db.close();
  return dbPath;
}

const SAMPLE_SQL = `
CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  author_id INTEGER NOT NULL REFERENCES authors(id),
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX posts_published_idx ON posts (published);
CREATE TABLE __chic_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE no_id_table (title TEXT NOT NULL);
`;

describe('database introspection', () => {
  const roots = [];
  const previousDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('maps SQL types and boolean-like integer columns', () => {
    expect(mapSqlType('TEXT', 'title')).toBe('string');
    expect(mapSqlType('VARCHAR(255)', 'email')).toBe('string');
    expect(mapSqlType('INTEGER', 'views')).toBe('integer');
    expect(mapSqlType('REAL', 'price')).toBe('float');
    expect(mapSqlType('BOOLEAN', 'ok')).toBe('boolean');
    expect(mapSqlType('INTEGER', 'published')).toBe('boolean');
    expect(mapSqlType('INTEGER', 'published_at')).toBe('datetime');
    expect(mapSqlType('JSON', 'payload')).toBe('json');
    expect(mapSqlType('INTEGER', 'author_id')).toBe('references');
    expect(mapSqlType('TEXT', 'user_id', { foreignKey: true })).toBe('references');
  });

  it('parses table lists and filters system, only, and except tables', () => {
    expect(parseTableList('books, authors comments')).toEqual(['books', 'authors', 'comments']);
    expect(isSystemTable('sqlite_sequence')).toBe(true);
    expect(isSystemTable('__chic_migrations')).toBe(true);
    expect(isSystemTable('posts')).toBe(false);

    expect(selectTableNames(
      ['authors', 'posts', '__chic_migrations', 'sqlite_sequence'],
      {}
    )).toEqual(['authors', 'posts']);

    expect(selectTableNames(
      ['authors', 'posts', 'users'],
      { only: 'posts,authors', except: 'authors' }
    )).toEqual(['posts']);

    expect(() => selectTableNames(['posts'], { only: 'missing' })).toThrow('was not found');
    expect(() => selectTableNames(['__chic_migrations'], { only: '__chic_migrations' }))
      .toThrow('system table');
  });

  it('resolves the database file from an override, env, or chic.db', () => {
    const root = fixture();
    roots.push(root);
    expect(() => resolveDatabasePath(root)).toThrow('No SQLite database found');

    const dbPath = writeDatabase(root, 'CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT);');
    expect(resolveDatabasePath(root)).toBe(dbPath);
    expect(resolveDatabasePath(root, './chic.db')).toBe(dbPath);

    delete process.env.DATABASE_URL;
    fs.writeFileSync(path.join(root, '.env'), 'DATABASE_URL=file:legacy.db\n');
    const legacy = writeDatabase(root, 'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT);', 'legacy.db');
    expect(resolveDatabasePath(root)).toBe(legacy);
  });

  it('reads tables, unique indexes, foreign keys, and skips unmanaged columns', async () => {
    const root = fixture();
    roots.push(root);
    writeDatabase(root, SAMPLE_SQL);

    const inspected = await inspectDatabase(root);
    expect(inspected.tables.map((table) => table.name)).toEqual([
      '__chic_migrations',
      'authors',
      'no_id_table',
      'posts'
    ]);

    const { prepared, skipped } = prepareScaffoldTables(inspected, {});
    expect(skipped.map((entry) => entry.name)).toEqual(['no_id_table']);
    expect(prepared.map((entry) => entry.name)).toEqual(['authors', 'posts']);

    const authors = prepared.find((entry) => entry.name === 'authors');
    expect(authors.fields).toEqual([
      expect.objectContaining({ name: 'name', type: 'string', required: true, unique: true })
    ]);

    const posts = tableToScaffold(inspected.tables.find((table) => table.name === 'posts'));
    expect(posts.createdAt).toBe(true);
    expect(posts.updatedAt).toBe(true);
    expect(posts.fields).toEqual([
      expect.objectContaining({ name: 'title', type: 'string', required: true }),
      expect.objectContaining({ name: 'body', type: 'string', required: false }),
      expect.objectContaining({ name: 'published', type: 'boolean', index: true }),
      expect.objectContaining({ name: 'author', type: 'references', reference: 'authors', column: 'author_id' }),
      expect.objectContaining({ name: 'publishedAt', type: 'datetime' })
    ]);
    expect(posts.fields.every((field) => !['id', 'createdAt', 'updatedAt'].includes(field.name))).toBe(true);
  });

  it('scaffolds full CRUD for selected tables and leaves existing tables unmigrated', async () => {
    const root = fixture({ '@playwright/test': 'latest' });
    roots.push(root);
    writeDatabase(root, SAMPLE_SQL);

    const { plan, tables } = await buildFromDatabasePlan(root, { only: 'posts,authors', api: 'rest' });
    expect(tables.map((entry) => entry.table)).toEqual(['authors', 'posts']);
    await plan.execute();

    expect(fs.existsSync(path.join(root, 'src/routes/posts/+page.svelte'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/routes/posts/new/+page.svelte'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/routes/posts/[id]/+page.svelte'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/routes/posts/[id]/edit/+page.svelte'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/routes/api/posts/+server.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/lib/components/posts/Form.svelte'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/lib/server/posts.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/lib/server/db/schema/posts.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/routes/authors/+page.svelte'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'tests/chic/posts.spec.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'drizzle'))).toBe(false);

    const schema = fs.readFileSync(path.join(root, 'src/lib/server/db/schema/posts.ts'), 'utf8');
    expect(schema).toContain("sqliteTable('posts'");
    expect(schema).toContain('author:');
    expect(schema).toContain(".references(() => authors.id)");
    expect(schema).toContain('createdAt:');
    expect(fs.readFileSync(path.join(root, 'src/lib/server/db/schema.ts'), 'utf8')).toContain("export * from './schema/posts'");
    expect(fs.readFileSync(path.join(root, 'src/lib/server/db/schema.ts'), 'utf8')).toContain("export * from './schema/authors'");

    const form = fs.readFileSync(path.join(root, 'src/lib/components/posts/Form.svelte'), 'utf8');
    expect(form).toContain('name="title"');
    expect(form).toContain('type="checkbox"');
    expect(form).toContain('name="author"');

    const config = JSON.parse(fs.readFileSync(path.join(root, 'chic.json'), 'utf8'));
    expect(config.models.map((model) => model.name)).toEqual(['Author', 'Post']);
    expect(config.models.find((model) => model.name === 'Post').table).toBe('posts');
    expect(config.routes.some((route) => route.path === '/posts')).toBe(true);
    expect(config.routes.some((route) => route.path === '/api/authors')).toBe(true);
  });

  it('honors --except, preserves singular table names, and supports dry runs', async () => {
    const root = fixture();
    roots.push(root);
    writeDatabase(root, `
      CREATE TABLE book (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL
      );
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL
      );
    `);

    const dry = await buildFromDatabasePlan(root, { except: 'users', dryRun: true });
    expect(dry.tables.map((entry) => entry.table)).toEqual(['book']);
    expect(dry.tables[0].names).toMatchObject(namesFor('book', { table: 'book' }));
    await dry.plan.execute();
    expect(fs.existsSync(path.join(root, 'src/routes/books'))).toBe(false);

    const { plan } = await buildFromDatabasePlan(root, { except: ['users'] });
    await plan.execute();
    const schema = fs.readFileSync(path.join(root, 'src/lib/server/db/schema/books.ts'), 'utf8');
    expect(schema).toContain("sqliteTable('book'");
    expect(schema).not.toContain('createdAt:');
    expect(fs.existsSync(path.join(root, 'src/routes/users'))).toBe(false);
    expect(fs.readFileSync(path.join(root, 'src/lib/server/books.ts'), 'utf8')).not.toContain('updatedAt: new Date()');
  });

  it('rejects unknown --only tables and already registered models', async () => {
    const root = fixture();
    roots.push(root);
    writeDatabase(root, 'CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL);');

    await expect(buildFromDatabasePlan(root, { only: 'missing' })).rejects.toThrow('was not found');

    const first = await buildFromDatabasePlan(root, { only: 'posts' });
    await first.plan.execute();
    await expect(buildFromDatabasePlan(root, { only: 'posts' })).rejects.toThrow('already exists');

    const forced = await buildFromDatabasePlan(root, { only: 'posts', force: true });
    expect(forced.tables).toHaveLength(1);
  });
});
