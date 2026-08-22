import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDestroyPlan,
  buildModelPlan,
  buildScaffoldPlan,
  buildSimplePlan,
  namesFor,
  parseFields
} from '../lib/generator.js';

function fixture(dependencies = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chic-generator-'));
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

describe('Drizzle generator', () => {
  const roots = [];
  afterEach(() => {
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  it('inflects irregular resource names', () => {
    expect(namesFor('Person')).toMatchObject({
      singular: 'person',
      plural: 'people',
      model: 'Person',
      table: 'people'
    });
  });

  it('parses field modifiers and rejects unknown types', () => {
    expect(parseFields(['email:string:unique', 'published:boolean:optional,index'])).toEqual([
      expect.objectContaining({ name: 'email', type: 'string', unique: true, required: true }),
      expect.objectContaining({ name: 'published', type: 'boolean', index: true, required: false })
    ]);
    expect(() => parseFields(['name:mystery'])).toThrow('Unknown field type');
    expect(() => parseFields(['avatar:file'])).toThrow('Unknown field type');
  });

  it('creates a complete TypeScript scaffold and one config transaction', async () => {
    const root = fixture();
    roots.push(root);
    const { plan } = buildScaffoldPlan(
      root,
      'Post',
      ['title:string', 'published:boolean:index'],
      { api: 'rest' }
    );
    await plan.execute();

    expect(fs.existsSync(path.join(root, 'src/lib/server/db/schema/posts.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/routes/posts/+page.svelte'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/routes/api/posts/+server.ts'))).toBe(true);
    const config = JSON.parse(fs.readFileSync(path.join(root, 'chic.json'), 'utf8'));
    expect(config.models).toHaveLength(1);
    expect(config.routes).toHaveLength(6);
    expect(config.routes.every((route) => route.resource === 'Post')).toBe(true);
  });

  it('keeps model-only generation free of page routes', async () => {
    const root = fixture();
    roots.push(root);
    const { plan } = buildModelPlan(root, 'Category', ['name:string'], {});
    await plan.execute();

    const config = JSON.parse(fs.readFileSync(path.join(root, 'chic.json'), 'utf8'));
    expect(config.routes).toEqual([]);
    expect(fs.existsSync(path.join(root, 'src/routes/categories'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src/lib/server/categories.ts'))).toBe(true);
  });

  it('reverses registered scaffold artifacts', async () => {
    const root = fixture();
    roots.push(root);
    const generated = buildScaffoldPlan(root, 'Post', ['title:string'], {});
    await generated.plan.execute();
    const destroyed = buildDestroyPlan(root, 'Post', {});
    await destroyed.plan.execute();

    const config = JSON.parse(fs.readFileSync(path.join(root, 'chic.json'), 'utf8'));
    expect(config.models).toEqual([]);
    expect(config.routes).toEqual([]);
    expect(fs.existsSync(path.join(root, 'src/routes/posts'))).toBe(false);
    expect(fs.readFileSync(path.join(root, 'src/lib/server/db/schema.ts'), 'utf8')).not.toContain('chic:Post');
    const migrations = fs.readdirSync(path.join(root, 'drizzle/chic'));
    expect(migrations.some((file) => file.includes('_create_posts.up.sql'))).toBe(true);
    expect(migrations.some((file) => file.includes('_drop_posts.up.sql'))).toBe(true);
  });

  it('supports dry runs and blocks path traversal', async () => {
    const root = fixture();
    roots.push(root);
    const generated = buildSimplePlan(root, 'component', 'Card', { dryRun: true });
    await generated.plan.execute();
    expect(fs.existsSync(path.join(root, 'src/lib/components/Card.svelte'))).toBe(false);
    expect(() => buildSimplePlan(root, 'route', '/../secret', {})).toThrow('Invalid route path');
  });

  it('generates a CRUD browser test when Playwright is installed', async () => {
    const root = fixture({ '@playwright/test': 'latest' });
    roots.push(root);
    const { plan } = buildScaffoldPlan(root, 'Post', ['title:string'], {});
    await plan.execute();
    expect(fs.existsSync(path.join(root, 'tests/chic/posts.spec.ts'))).toBe(true);
  });
});

