import fs from 'node:fs';
import path from 'node:path';
import pluralize from 'pluralize';

const FIELD_TYPES = new Set([
  'string', 'text', 'integer', 'number', 'float', 'boolean', 'date',
  'datetime', 'json', 'references'
]);

export const CONFIG_VERSION = 2;

function camel(value) {
  return value
    .replace(/[-_\s]+(.)?/g, (_, letter = '') => letter.toUpperCase())
    .replace(/^(.)/, (letter) => letter.toLowerCase());
}

function pascal(value) {
  const result = camel(value);
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function snake(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

export function namesFor(input) {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(input)) {
    throw new Error(`Invalid resource name "${input}". Use letters, numbers, "_" or "-".`);
  }
  const singular = camel(pluralize.singular(input));
  const plural = camel(pluralize.plural(singular));
  return {
    singular,
    plural,
    model: pascal(singular),
    table: snake(plural)
  };
}

export function parseFields(values) {
  const tokens = Array.isArray(values)
    ? values.flatMap((value) => String(value).split(/\s+/))
    : String(values || '').split(/\s+/);

  const fields = tokens.filter(Boolean).map((token) => {
    const [rawName, rawType = 'string', ...rawModifiers] = token.split(':');
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(rawName)) {
      throw new Error(`Invalid field name "${rawName}".`);
    }
    const type = rawType.toLowerCase();
    if (!FIELD_TYPES.has(type)) {
      throw new Error(
        `Unknown field type "${type}" for ${rawName}. Supported: ${[...FIELD_TYPES].join(', ')}.`
      );
    }
    const modifiers = rawModifiers.flatMap((part) => part.split(',')).filter(Boolean);
    const allowed = new Set(['required', 'optional', 'unique', 'index']);
    for (const modifier of modifiers) {
      if (!allowed.has(modifier)) {
        throw new Error(`Unknown modifier "${modifier}" for ${rawName}.`);
      }
    }
    return {
      name: camel(rawName),
      column: snake(rawName),
      type,
      required: !modifiers.includes('optional'),
      unique: modifiers.includes('unique'),
      index: modifiers.includes('index'),
      reference: type === 'references'
        ? namesFor(rawName.replace(/_id$/i, '')).plural
        : null
    };
  });

  if (!fields.length) throw new Error('At least one field is required.');
  const duplicates = fields.filter((field, index) =>
    fields.findIndex((other) => other.name === field.name) !== index
  );
  if (duplicates.length) throw new Error(`Duplicate field: ${duplicates[0].name}.`);
  return fields;
}

export function findProjectRoot(start = process.cwd(), requireChic = true) {
  let current = path.resolve(start);
  while (true) {
    const hasPackage = fs.existsSync(path.join(current, 'package.json'));
    const hasChic = fs.existsSync(path.join(current, 'chic.json'));
    if (hasPackage && (!requireChic || hasChic)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    requireChic
      ? 'Not inside a Chic project. Run `chic init` from a SvelteKit project first.'
      : 'Could not find a project package.json.'
  );
}

export function readConfig(root) {
  const file = path.join(root, 'chic.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    version: config.version || 1,
    orm: config.orm || 'sequelize',
    database: config.database || config.db?.type || 'sqlite',
    models: config.models || [],
    components: config.components || [],
    routes: config.routes || []
  };
}

function capturePath(absolutePath) {
  if (!fs.existsSync(absolutePath)) return null;
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    return {
      directory: true,
      children: Object.fromEntries(
        fs.readdirSync(absolutePath).map((entry) => [entry, capturePath(path.join(absolutePath, entry))])
      )
    };
  }
  return { directory: false, content: fs.readFileSync(absolutePath), mode: stat.mode };
}

function restorePath(absolutePath, snapshot) {
  fs.rmSync(absolutePath, { force: true, recursive: true });
  if (snapshot === null) return;
  if (snapshot.directory) {
    fs.mkdirSync(absolutePath, { recursive: true });
    for (const [entry, child] of Object.entries(snapshot.children)) {
      restorePath(path.join(absolutePath, entry), child);
    }
    return;
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, snapshot.content, { mode: snapshot.mode });
}

export class GenerationPlan {
  constructor(root, options = {}) {
    this.root = root;
    this.options = {
      dryRun: Boolean(options.dryRun),
      force: Boolean(options.force),
      skip: Boolean(options.skip)
    };
    this.operations = [];
  }

  write(relativePath, content, { overwrite = false } = {}) {
    this.operations.push({ type: 'write', relativePath, content, overwrite });
  }

  remove(relativePath) {
    this.operations.push({ type: 'remove', relativePath });
  }

  async execute() {
    const collisions = this.operations.filter((operation) =>
      operation.type === 'write' &&
      fs.existsSync(path.join(this.root, operation.relativePath)) &&
      !operation.overwrite
    );
    if (collisions.length && !this.options.force && !this.options.skip) {
      throw new Error(
        `Refusing to overwrite:\n${collisions.map((item) => `  ${item.relativePath}`).join('\n')}\n` +
        'Use --force to replace or --skip to keep existing files.'
      );
    }

    const applied = [];
    try {
      for (const operation of this.operations) {
        const absolutePath = path.resolve(this.root, operation.relativePath);
        const rootPrefix = `${path.resolve(this.root)}${path.sep}`;
        if (absolutePath !== path.resolve(this.root) && !absolutePath.startsWith(rootPrefix)) {
          throw new Error(`Generated path escapes the project: ${operation.relativePath}`);
        }
        const exists = fs.existsSync(absolutePath);
        if (operation.type === 'write' && exists && this.options.skip && !operation.overwrite) {
          console.log(`  skip   ${operation.relativePath}`);
          continue;
        }
        const verb = operation.type === 'remove' ? 'remove' : exists ? 'update' : 'create';
        console.log(`  ${verb.padEnd(7)}${operation.relativePath}`);
        if (this.options.dryRun) continue;

        const previous = capturePath(absolutePath);
        applied.push({ absolutePath, previous });
        if (operation.type === 'remove') {
          if (exists) fs.rmSync(absolutePath, { force: true, recursive: true });
          continue;
        }
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        const temporary = `${absolutePath}.chic-${process.pid}.tmp`;
        fs.writeFileSync(temporary, operation.content);
        fs.renameSync(temporary, absolutePath);
      }
    } catch (error) {
      for (const item of applied.reverse()) {
        restorePath(item.absolutePath, item.previous);
      }
      throw error;
    }
  }
}

function drizzleColumn(field) {
  const options = field.type === 'boolean' ? `, { mode: 'boolean' }`
    : field.type === 'datetime' ? `, { mode: 'timestamp' }`
      : '';
  let expression;
  switch (field.type) {
    case 'integer':
    case 'number':
      expression = `integer('${field.column}')`;
      break;
    case 'float':
      expression = `real('${field.column}')`;
      break;
    case 'boolean':
      expression = `integer('${field.column}'${options}).default(false)`;
      break;
    case 'datetime':
      expression = `integer('${field.column}'${options})`;
      break;
    case 'references':
      expression = `integer('${field.column.replace(/_id$/, '')}_id').references(() => ${field.reference}.id)`;
      break;
    case 'json':
      expression = `text('${field.column}', { mode: 'json' })`;
      break;
    default:
      expression = `text('${field.column}')`;
  }
  if (field.required) expression += '.notNull()';
  if (field.unique) expression += '.unique()';
  return expression;
}

function schemaTemplate(names, fields) {
  const references = [...new Set(fields.filter((field) => field.reference).map((field) => field.reference))];
  const referenceImports = references
    .filter((reference) => reference !== names.plural)
    .map((reference) => `import { ${reference} } from './${reference}';`)
    .join('\n');
  const columns = fields
    .map((field) => `  ${field.name}: ${drizzleColumn(field)},`)
    .join('\n');
  const indexes = fields
    .filter((field) => field.index)
    .map((field) => `    ${field.name}Idx: index('${names.table}_${field.column}_idx').on(table.${field.name}),`)
    .join('\n');

  return `import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
${referenceImports}

export const ${names.plural} = sqliteTable('${names.table}', {
  id: integer('id').primaryKey({ autoIncrement: true }),
${columns}
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}${indexes ? `, (table) => ({\n${indexes}\n  })` : ''});

export type ${names.model} = typeof ${names.plural}.$inferSelect;
export type New${names.model} = typeof ${names.plural}.$inferInsert;
`;
}

function zodExpression(field) {
  let expression;
  switch (field.type) {
    case 'integer':
    case 'number':
    case 'float':
    case 'references':
      expression = 'z.coerce.number()';
      break;
    case 'boolean':
      expression = `z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean())`;
      break;
    case 'date':
      expression = `z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, 'Expected a date')`;
      break;
    case 'datetime':
      expression = 'z.coerce.date()';
      break;
    case 'json':
      expression = 'jsonValue';
      break;
    default:
      expression = field.type === 'text' ? 'z.string().trim().min(1)' : 'z.string().trim().min(1).max(255)';
  }
  return field.required ? expression : `${expression}.optional()`;
}

function serviceTemplate(names, fields) {
  const shape = fields.map((field) => `  ${field.name}: ${zodExpression(field)},`).join('\n');
  const jsonHelper = fields.some((field) => field.type === 'json') ? `
const jsonValue = z.any().transform((value, context) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    context.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
});
` : '';
  return `import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { ${names.plural} } from '$lib/server/db/schema/${names.plural}';
${jsonHelper}
export const ${names.singular}Input = z.object({
${shape}
});

export function validate${names.model}(input: unknown) {
  const result = ${names.singular}Input.safeParse(input);
  if (result.success) return { data: result.data, errors: null };
  const errors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0] || 'form'), issue.message]));
  return { data: null, errors };
}

export async function list${pascal(names.plural)}() {
  return db.select().from(${names.plural}).all();
}

export async function get${names.model}(id: number) {
  return db.select().from(${names.plural}).where(eq(${names.plural}.id, id)).get();
}

export async function create${names.model}(input: unknown) {
  const data = ${names.singular}Input.parse(input);
  return db.insert(${names.plural}).values(data).returning().get();
}

export async function update${names.model}(id: number, input: unknown) {
  const data = ${names.singular}Input.parse(input);
  return db.update(${names.plural})
    .set({ ...data, updatedAt: new Date() })
    .where(eq(${names.plural}.id, id))
    .returning()
    .get();
}

export async function destroy${names.model}(id: number) {
  return db.delete(${names.plural}).where(eq(${names.plural}.id, id)).returning().get();
}
`;
}

function inputTemplate(field, source = `data.${field.name}`) {
  const attributes = `name="${field.name}" id="${field.name}"`;
  switch (field.type) {
    case 'text':
    case 'json':
      return `<textarea ${attributes}>${`{${source} ?? ''}`}</textarea>`;
    case 'boolean':
      return `<input ${attributes} type="checkbox" checked={${source} ?? false} />`;
    case 'integer':
    case 'number':
    case 'float':
    case 'references':
      return `<input ${attributes} type="number" value={${source} ?? ''} />`;
    case 'date':
      return `<input ${attributes} type="date" value={${source} ?? ''} />`;
    case 'datetime':
      return `<input ${attributes} type="datetime-local" value={${source} ?? ''} />`;
    case 'file':
      return `<input ${attributes} type="file" />`;
    default:
      return `<input ${attributes} type="text" value={${source} ?? ''} />`;
  }
}

function formTemplate(names, fields) {
  const controls = fields.map((field) => `  <label for="${field.name}">${pascal(field.name)}</label>
  ${inputTemplate(field)}
  {#if errors.${field.name}}<small class="error">{errors.${field.name}}</small>{/if}`).join('\n');
  const controlSelectors = [
    fields.some((field) => !['text', 'json'].includes(field.type)) ? 'form input' : null,
    fields.some((field) => ['text', 'json'].includes(field.type)) ? 'form textarea' : null
  ].filter(Boolean).join(', ');
  return `<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ${names.model} } from '$lib/server/db/schema/${names.plural}';

  type Props = { data?: Partial<${names.model}>; errors?: Record<string, string>; action?: string };
  let { data = {}, errors = {}, action = '' }: Props = $props();
</script>

<form method="POST" {action} use:enhance enctype="multipart/form-data">
${controls}
  {#if errors.form}<p class="error">{errors.form}</p>{/if}
  <button type="submit">Save ${names.singular}</button>
</form>

<style>
  form { display: grid; gap: .6rem; max-width: 36rem; }
  ${controlSelectors} { padding: .65rem; }
  .error { color: #b91c1c; }
</style>
`;
}

function loadIndexTemplate(names) {
  return `import type { PageServerLoad } from './$types';
import { list${pascal(names.plural)} } from '$lib/server/${names.plural}';

export const load: PageServerLoad = async () => ({
  ${names.plural}: await list${pascal(names.plural)}()
});
`;
}

function indexPageTemplate(names, fields) {
  const label = fields[0].name;
  return `<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head><title>${pascal(names.plural)}</title></svelte:head>
<h1>${pascal(names.plural)}</h1>
<p><a href="/${names.plural}/new">New ${names.singular}</a></p>
{#if data.${names.plural}.length}
  <ul>
    {#each data.${names.plural} as item (item.id)}
      <li><a href="/${names.plural}/{item.id}">{item.${label}}</a></li>
    {/each}
  </ul>
{:else}
  <p>No ${names.plural} yet.</p>
{/if}
`;
}

function newServerTemplate(names) {
  return `import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { create${names.model}, validate${names.model} } from '$lib/server/${names.plural}';

export const actions: Actions = {
  default: async ({ request }) => {
    const values = Object.fromEntries(await request.formData());
    const result = validate${names.model}(values);
    if (!result.data) return fail(422, { values, errors: result.errors });
    const item = await create${names.model}(result.data);
    redirect(303, '/${names.plural}/' + item.id);
  }
};
`;
}

function formPageTemplate(names, mode) {
  const edit = mode === 'edit';
  return `<script lang="ts">
  import type { PageProps } from './$types';
  import Form from '$lib/components/${names.plural}/Form.svelte';
  let { data, form }: PageProps = $props();
</script>

<svelte:head><title>${edit ? 'Edit' : 'New'} ${names.model}</title></svelte:head>
<h1>${edit ? 'Edit' : 'New'} ${names.model}</h1>
<Form data={${edit ? `data.${names.singular}` : 'form?.values'}} errors={form?.errors} />
<p><a href="/${names.plural}">Back to ${names.plural}</a></p>
${edit ? `<form method="POST" action="?/destroy"><button class="danger">Delete ${names.singular}</button></form>` : ''}
`;
}

function itemServerTemplate(names, edit) {
  const actions = edit ? `
export const actions: Actions = {
  update: async ({ params, request }) => {
    const values = Object.fromEntries(await request.formData());
    const result = validate${names.model}(values);
    if (!result.data) return fail(422, { values, errors: result.errors });
    await update${names.model}(Number(params.id), result.data);
    redirect(303, '/${names.plural}/' + params.id);
  },
  destroy: async ({ params }) => {
    await destroy${names.model}(Number(params.id));
    redirect(303, '/${names.plural}');
  }
};` : '';
  return `import { error${edit ? ', fail, redirect' : ''} } from '@sveltejs/kit';
import type { ${edit ? 'Actions, ' : ''}PageServerLoad } from './$types';
import { get${names.model}${edit ? `, update${names.model}, destroy${names.model}, validate${names.model}` : ''} } from '$lib/server/${names.plural}';

export const load: PageServerLoad = async ({ params }) => {
  const item = await get${names.model}(Number(params.id));
  if (!item) error(404, '${names.model} not found');
  return { ${names.singular}: item };
};
${actions}
`;
}

function showPageTemplate(names) {
  return `<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head><title>${names.model}</title></svelte:head>
<h1>${names.model}</h1>
{#each Object.entries(data.${names.singular}) as [key, value]}
  <p><strong>{key}:</strong> {String(value ?? '')}</p>
{/each}
<p><a href="/${names.plural}/{data.${names.singular}.id}/edit">Edit</a> · <a href="/${names.plural}">Back</a></p>
`;
}

function apiIndexTemplate(names) {
  return `import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { create${names.model}, list${pascal(names.plural)}, validate${names.model} } from '$lib/server/${names.plural}';

export const GET: RequestHandler = async () => json(await list${pascal(names.plural)}());
export const POST: RequestHandler = async ({ request }) => {
  const input = await request.json();
  const result = validate${names.model}(input);
  if (!result.data) return json({ errors: result.errors }, { status: 422 });
  return json(await create${names.model}(result.data), { status: 201 });
};
`;
}

function apiItemTemplate(names) {
  return `import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroy${names.model}, get${names.model}, update${names.model}, validate${names.model} } from '$lib/server/${names.plural}';

export const GET: RequestHandler = async ({ params }) => {
  const item = await get${names.model}(Number(params.id));
  if (!item) error(404, '${names.model} not found');
  return json(item);
};
export const PUT: RequestHandler = async ({ params, request }) => {
  const result = validate${names.model}(await request.json());
  if (!result.data) return json({ errors: result.errors }, { status: 422 });
  return json(await update${names.model}(Number(params.id), result.data));
};
export const DELETE: RequestHandler = async ({ params }) => {
  const item = await destroy${names.model}(Number(params.id));
  if (!item) error(404, '${names.model} not found');
  return new Response(null, { status: 204 });
};
`;
}

function remoteTemplate(names) {
  return `import { command, query } from '$app/server';
import { create${names.model}, destroy${names.model}, get${names.model}, list${pascal(names.plural)}, update${names.model} } from '$lib/server/${names.plural}';
import { z } from 'zod';

export const list${pascal(names.plural)}Remote = query(async () => list${pascal(names.plural)}());
export const get${names.model}Remote = query(z.number(), async (id) => get${names.model}(id));
export const create${names.model}Remote = command('unchecked', async (input) => create${names.model}(input));
export const update${names.model}Remote = command('unchecked', async ({ id, ...input }: Record<string, unknown> & { id: number }) => update${names.model}(id, input));
export const destroy${names.model}Remote = command(z.number(), async (id) => destroy${names.model}(id));
`;
}

function sqlType(field) {
  if (['integer', 'number', 'boolean', 'references', 'datetime'].includes(field.type)) return 'INTEGER';
  if (field.type === 'float') return 'REAL';
  return 'TEXT';
}

function migrationTemplates(names, fields) {
  const definitions = fields.map((field) => {
    const column = field.type === 'references' ? `${field.column.replace(/_id$/, '')}_id` : field.column;
    let result = `  "${column}" ${sqlType(field)}`;
    if (field.required) result += ' NOT NULL';
    if (field.unique) result += ' UNIQUE';
    if (field.type === 'references') result += ` REFERENCES "${snake(field.reference)}"(id)`;
    return result;
  });
  const indexes = fields.filter((field) => field.index).map((field) =>
    `CREATE INDEX "${names.table}_${field.column}_idx" ON "${names.table}" ("${field.column}");`
  );
  return {
    up: `CREATE TABLE "${names.table}" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
${definitions.join(',\n')},
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);
${indexes.join('\n')}
`,
    down: `DROP TABLE IF EXISTS "${names.table}";\n`
  };
}

function playwrightTemplate(names, fields) {
  const steps = fields.map((field) => {
    const label = pascal(field.name);
    if (field.type === 'boolean') return `  await page.getByLabel('${label}').check();`;
    const value = ['integer', 'number', 'float', 'references'].includes(field.type) ? '1'
      : field.type === 'date' ? '2026-01-02'
        : field.type === 'datetime' ? '2026-01-02T12:00'
          : field.type === 'json' ? '{"generated":true}'
            : `Example ${label}`;
    return `  await page.getByLabel('${label}').fill(${JSON.stringify(value)});`;
  }).join('\n');
  return `import { expect, test } from '@playwright/test';

test('${names.singular} CRUD scaffold', async ({ page }) => {
  await page.goto('/${names.plural}/new');
${steps}
  await page.getByRole('button', { name: 'Save ${names.singular}' }).click();
  await expect(page).toHaveURL(/\\/${names.plural}\\/\\d+$/);
  await expect(page.getByRole('heading', { name: '${names.model}' })).toBeVisible();
});
`;
}

function routeEntries(names, apiMode) {
  const routes = [
    ['GET', `/${names.plural}`, `List ${names.plural}`, `src/routes/${names.plural}/+page.svelte`],
    ['GET', `/${names.plural}/new`, `Create ${names.singular}`, `src/routes/${names.plural}/new/+page.svelte`],
    ['GET', `/${names.plural}/[id]`, `View ${names.singular}`, `src/routes/${names.plural}/[id]/+page.svelte`],
    ['GET', `/${names.plural}/[id]/edit`, `Edit ${names.singular}`, `src/routes/${names.plural}/[id]/edit/+page.svelte`]
  ];
  if (apiMode === 'rest') routes.push(
    ['GET/POST', `/api/${names.plural}`, `${names.model} collection API`, `src/routes/api/${names.plural}/+server.ts`],
    ['GET/PUT/DELETE', `/api/${names.plural}/[id]`, `${names.model} item API`, `src/routes/api/${names.plural}/[id]/+server.ts`]
  );
  return routes.map(([method, routePath, description, file]) => ({ method, path: routePath, description, file }));
}

export function routeInspector(config) {
  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const rows = config.routes.map((route) => `<tr><td><code>${escapeHtml(route.method)}</code></td><td><a href="${escapeHtml(route.path)}">${escapeHtml(route.path)}</a></td><td>${escapeHtml(route.description || '')}</td><td><code>${escapeHtml(route.file || '')}</code></td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Chic routes</title><style>body{font:15px system-ui;margin:2rem auto;max-width:1100px;padding:0 1rem}input{box-sizing:border-box;padding:.7rem;width:100%}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:.65rem;text-align:left}code{color:#7c3aed}</style></head><body><h1>Chic routes</h1><input id="q" placeholder="Filter routes"><table><thead><tr><th>Method</th><th>Path</th><th>Description</th><th>File</th></tr></thead><tbody>${rows}</tbody></table><script>const q=document.querySelector('#q');q.oninput=()=>document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q.value.toLowerCase()))</script></body></html>`;
  return `import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  if (!dev && env.CHIC_DEBUG !== 'ON') error(404, 'Not found');
  return new Response(${JSON.stringify(html)}, { headers: { 'content-type': 'text/html; charset=utf-8' } });
};
`;
}

function updateSchemaIndex(root, names, remove = false) {
  const relativePath = 'src/lib/server/db/schema.ts';
  const absolutePath = path.join(root, relativePath);
  const marker = `export * from './schema/${names.plural}'; // chic:${names.model}`;
  const current = fs.existsSync(absolutePath)
    ? fs.readFileSync(absolutePath, 'utf8')
    : '// Drizzle schema exports generated by Chic.\n';
  const lines = current.split('\n').filter((line) => line.trim() !== marker);
  if (!remove) lines.push(marker);
  return { relativePath, content: `${lines.filter((line, index, all) => line || index < all.length - 1).join('\n')}\n` };
}

export function buildScaffoldPlan(root, resource, fieldValues, options = {}) {
  const names = namesFor(resource);
  const fields = parseFields(fieldValues);
  const config = readConfig(root);
  if (config.orm !== 'drizzle') {
    throw new Error('This generator requires a Drizzle Chic project. Run `chic upgrade` first.');
  }
  const existingModel = config.models.find((model) => model.name === names.model);
  if (existingModel && !options.force) {
    throw new Error(`${names.model} already exists. Use --force to regenerate it.`);
  }
  if (existingModel && JSON.stringify(existingModel.fields) !== JSON.stringify(fields)) {
    throw new Error(
      `${names.model} fields changed. Generate a migration and update the schema explicitly; ` +
      '--force only regenerates an equivalent resource.'
    );
  }
  const apiMode = options.api || 'rest';
  if (!['none', 'rest', 'remote'].includes(apiMode)) {
    throw new Error('--api must be one of: none, rest, remote.');
  }
  const existingMigration = existingModel?.artifacts?.find((artifact) => artifact.endsWith('.up.sql'));
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const migrationBase = existingMigration
    ? existingMigration.replace(/\.up\.sql$/, '')
    : `drizzle/chic/${stamp}_create_${names.table}`;
  const artifacts = [
    `src/lib/server/db/schema/${names.plural}.ts`,
    `src/lib/server/${names.plural}.ts`,
    `src/lib/components/${names.plural}/Form.svelte`,
    `src/routes/${names.plural}`,
    `${migrationBase}.up.sql`,
    `${migrationBase}.down.sql`
  ];
  if (apiMode === 'rest') artifacts.push(`src/routes/api/${names.plural}`);
  if (apiMode === 'remote') artifacts.push(`src/lib/${names.plural}.remote.ts`);
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const hasPlaywright = Boolean(dependencies['@playwright/test']);
  if (hasPlaywright) artifacts.push(`tests/chic/${names.plural}.spec.ts`);

  const routes = config.routes
    .filter((route) => !route.resource || route.resource !== names.model)
    .concat(routeEntries(names, apiMode).map((route) => ({ ...route, resource: names.model })));
  const nextConfig = {
    ...config,
    version: CONFIG_VERSION,
    models: [
      ...config.models.filter((model) => model.name !== names.model),
      { name: names.model, table: names.table, fields, api: apiMode, artifacts }
    ],
    routes
  };
  const plan = new GenerationPlan(root, options);
  for (const oldArtifact of existingModel?.artifacts || []) {
    if (!artifacts.includes(oldArtifact) && !oldArtifact.endsWith('.up.sql') && !oldArtifact.endsWith('.down.sql')) {
      plan.remove(oldArtifact);
    }
  }
  const schemaIndex = updateSchemaIndex(root, names);
  const migrations = migrationTemplates(names, fields);
  plan.write(`src/lib/server/db/schema/${names.plural}.ts`, schemaTemplate(names, fields));
  plan.write(schemaIndex.relativePath, schemaIndex.content, { overwrite: true });
  plan.write(`src/lib/server/${names.plural}.ts`, serviceTemplate(names, fields));
  plan.write(`src/lib/components/${names.plural}/Form.svelte`, formTemplate(names, fields));
  plan.write(`src/routes/${names.plural}/+page.server.ts`, loadIndexTemplate(names));
  plan.write(`src/routes/${names.plural}/+page.svelte`, indexPageTemplate(names, fields));
  plan.write(`src/routes/${names.plural}/new/+page.server.ts`, newServerTemplate(names));
  plan.write(`src/routes/${names.plural}/new/+page.svelte`, formPageTemplate(names, 'new'));
  plan.write(`src/routes/${names.plural}/[id]/+page.server.ts`, itemServerTemplate(names, false));
  plan.write(`src/routes/${names.plural}/[id]/+page.svelte`, showPageTemplate(names));
  plan.write(`src/routes/${names.plural}/[id]/edit/+page.server.ts`, itemServerTemplate(names, true));
  plan.write(`src/routes/${names.plural}/[id]/edit/+page.svelte`, formPageTemplate(names, 'edit'));
  if (apiMode === 'rest') {
    plan.write(`src/routes/api/${names.plural}/+server.ts`, apiIndexTemplate(names));
    plan.write(`src/routes/api/${names.plural}/[id]/+server.ts`, apiItemTemplate(names));
  }
  if (apiMode === 'remote') {
    plan.write(`src/lib/${names.plural}.remote.ts`, remoteTemplate(names));
  }
  if (hasPlaywright) {
    plan.write(`tests/chic/${names.plural}.spec.ts`, playwrightTemplate(names, fields));
  }
  plan.write(`${migrationBase}.up.sql`, migrations.up);
  plan.write(`${migrationBase}.down.sql`, migrations.down);
  plan.write('src/routes/__chic/routes/+server.ts', routeInspector(nextConfig), { overwrite: true });
  plan.write('chic.json', `${JSON.stringify(nextConfig, null, 2)}\n`, { overwrite: true });
  return { plan, names, config: nextConfig };
}

export function buildModelPlan(root, resource, fieldValues, options = {}) {
  const built = buildScaffoldPlan(root, resource, fieldValues, { ...options, api: 'none' });
  built.plan.operations = built.plan.operations.filter((operation) =>
    !operation.relativePath.startsWith(`src/routes/${built.names.plural}`) &&
    !operation.relativePath.startsWith(`src/lib/components/${built.names.plural}`) &&
    operation.relativePath !== `tests/chic/${built.names.plural}.spec.ts`
  );
  const model = built.config.models.find((entry) => entry.name === built.names.model);
  model.artifacts = model.artifacts.filter((artifact) =>
    !artifact.startsWith(`src/routes/${built.names.plural}`) &&
    !artifact.startsWith(`src/lib/components/${built.names.plural}`) &&
    artifact !== `tests/chic/${built.names.plural}.spec.ts`
  );
  built.config.routes = built.config.routes.filter((route) => route.resource !== built.names.model);
  const inspectorOperation = built.plan.operations.find((operation) =>
    operation.relativePath === 'src/routes/__chic/routes/+server.ts'
  );
  inspectorOperation.content = routeInspector(built.config);
  const configOperation = built.plan.operations.find((operation) => operation.relativePath === 'chic.json');
  configOperation.content = `${JSON.stringify(built.config, null, 2)}\n`;
  return built;
}

export function buildControllerPlan(root, resource, options = {}) {
  const names = namesFor(resource);
  const config = readConfig(root);
  const model = config.models.find((entry) => entry.name === names.model);
  if (!model) throw new Error(`Generate the ${names.model} model first.`);
  const plan = new GenerationPlan(root, options);
  plan.write(`src/lib/server/${names.plural}.ts`, serviceTemplate(names, model.fields));
  return { plan, names, config };
}

export function buildDestroyPlan(root, resource, options = {}) {
  const names = namesFor(resource);
  const config = readConfig(root);
  const model = config.models.find((entry) => entry.name === names.model);
  if (!model) throw new Error(`${names.model} is not registered in chic.json.`);
  const nextConfig = {
    ...config,
    models: config.models.filter((entry) => entry.name !== names.model),
    routes: config.routes.filter((route) => route.resource !== names.model)
  };
  const plan = new GenerationPlan(root, options);
  for (const artifact of model.artifacts || []) {
    if (!artifact.endsWith('.up.sql') && !artifact.endsWith('.down.sql')) plan.remove(artifact);
  }
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const dropBase = `drizzle/chic/${stamp}_drop_${names.table}`;
  const originalMigration = migrationTemplates(names, model.fields);
  plan.write(`${dropBase}.up.sql`, originalMigration.down);
  plan.write(`${dropBase}.down.sql`, originalMigration.up);
  const schemaIndex = updateSchemaIndex(root, names, true);
  plan.write(schemaIndex.relativePath, schemaIndex.content, { overwrite: true });
  plan.write('src/routes/__chic/routes/+server.ts', routeInspector(nextConfig), { overwrite: true });
  plan.write('chic.json', `${JSON.stringify(nextConfig, null, 2)}\n`, { overwrite: true });
  return { plan, names, config: nextConfig };
}

export function buildSimplePlan(root, kind, input, options = {}) {
  const plan = new GenerationPlan(root, options);
  const config = readConfig(root);
  if (kind === 'component') {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(input)) throw new Error('Invalid component name.');
    const name = pascal(input);
    plan.write(`src/lib/components/${name}.svelte`, `<script lang="ts">\n  import type { Snippet } from 'svelte';\n  type Props = { children?: Snippet } & Record<string, unknown>;\n  let { children, ...props }: Props = $props();\n</script>\n\n<div class="${snake(name)}">{@render children?.()}</div>\n`);
    config.components = [...new Set([...config.components, name])];
  } else if (kind === 'route') {
    const clean = input.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!clean || clean.split('/').some((segment) => segment === '..' || !/^[A-Za-z0-9_[\]-]+$/.test(segment))) {
      throw new Error('Invalid route path.');
    }
    plan.write(`src/routes/${clean}/+page.svelte`, `<svelte:head><title>${pascal(clean.split('/').at(-1))}</title></svelte:head>\n<h1>${pascal(clean.split('/').at(-1))}</h1>\n`);
    config.routes.push({ method: 'GET', path: `/${clean}`, description: `${pascal(clean)} page`, file: `src/routes/${clean}/+page.svelte` });
  } else {
    throw new Error(`Unknown generator "${kind}".`);
  }
  plan.write('src/routes/__chic/routes/+server.ts', routeInspector(config), { overwrite: true });
  plan.write('chic.json', `${JSON.stringify(config, null, 2)}\n`, { overwrite: true });
  return { plan, config };
}

export function buildMigrationPlan(root, name, upSql = '-- Write the forward migration here.\n', options = {}) {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) throw new Error('Invalid migration name.');
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const base = `drizzle/chic/${stamp}_${snake(name)}`;
  const plan = new GenerationPlan(root, options);
  plan.write(`${base}.up.sql`, `${upSql.trim()}\n`);
  plan.write(`${base}.down.sql`, '-- Write the rollback migration here.\n');
  return { plan, base };
}

export function renderRouteList(config) {
  const widths = {
    method: Math.max(6, ...config.routes.map((route) => route.method.length)),
    path: Math.max(4, ...config.routes.map((route) => route.path.length))
  };
  return config.routes.map((route) =>
    `${route.method.padEnd(widths.method)}  ${route.path.padEnd(widths.path)}  ${route.description || ''}`
  ).join('\n');
}

