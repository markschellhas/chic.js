import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { CONFIG_VERSION, GenerationPlan, findProjectRoot, readConfig, routeInspector } from './generator.js';

export function detectPackageManager(root) {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(root, 'bun.lockb')) || fs.existsSync(path.join(root, 'bun.lock'))) return 'bun';
  return 'npm';
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: false,
      env: { ...process.env, ...options.env }
    });
    let stdout = '';
    let stderr = '';
    if (options.capture) {
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ code, stdout, stderr });
      else reject(new Error(`${command} exited with ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
    });
  });
}

function databaseRunnerTemplate() {
  return `import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

function envValue(name, fallback) {
  if (process.env[name]) return process.env[name];
  if (fs.existsSync('.env')) {
    const line = fs.readFileSync('.env', 'utf8').split(/\\r?\\n/).find((entry) => entry.startsWith(name + '='));
    if (line) return line.slice(name.length + 1).replace(/^['"]|['"]$/g, '');
  }
  return fallback;
}

const url = envValue('DATABASE_URL', 'chic.db').replace(/^file:/, '');
const db = new Database(url);
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS "__chic_migrations" (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');

const directory = path.resolve('drizzle/chic');
const files = fs.existsSync(directory)
  ? fs.readdirSync(directory).filter((file) => file.endsWith('.up.sql')).sort()
  : [];

function applied() {
  return new Set(db.prepare('SELECT name FROM "__chic_migrations" ORDER BY name').all().map((row) => row.name));
}

function migrate() {
  const done = applied();
  for (const file of files.filter((entry) => !done.has(entry.replace(/\\.up\\.sql$/, '')))) {
    const name = file.replace(/\\.up\\.sql$/, '');
    const sql = fs.readFileSync(path.join(directory, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO "__chic_migrations" (name, applied_at) VALUES (?, ?)').run(name, Date.now());
    })();
    console.log('migrate ' + name);
  }
}

function rollback() {
  const latest = db.prepare('SELECT name FROM "__chic_migrations" ORDER BY name DESC LIMIT 1').get();
  if (!latest) return console.log('Nothing to rollback.');
  const file = path.join(directory, latest.name + '.down.sql');
  if (!fs.existsSync(file)) throw new Error('Missing rollback file: ' + file);
  db.transaction(() => {
    db.exec(fs.readFileSync(file, 'utf8'));
    db.prepare('DELETE FROM "__chic_migrations" WHERE name = ?').run(latest.name);
  })();
  console.log('rollback ' + latest.name);
}

const command = process.argv[2] || 'migrate';
if (command === 'migrate') migrate();
else if (command === 'rollback') rollback();
else if (command === 'reset') {
  while (db.prepare('SELECT 1 FROM "__chic_migrations" LIMIT 1').get()) rollback();
  migrate();
} else if (command === 'seed') {
  const seed = await import(new URL('./seed.mjs', import.meta.url));
  await seed.default(db);
  console.log('Seed complete.');
} else throw new Error('Unknown database command: ' + command);

db.close();
`;
}

function consoleTemplate() {
  return `import fs from 'node:fs';
import repl from 'node:repl';
import Database from 'better-sqlite3';

const line = fs.existsSync('.env')
  ? fs.readFileSync('.env', 'utf8').split(/\\r?\\n/).find((entry) => entry.startsWith('DATABASE_URL='))
  : null;
const filename = (process.env.DATABASE_URL || line?.slice('DATABASE_URL='.length) || 'chic.db').replace(/^file:/, '');
const server = repl.start({ prompt: 'chic> ', useGlobal: true });
server.context.db = new Database(filename);
server.context.help = 'Use db.prepare("select * from posts").all()';
console.log('Raw SQLite connection is available as db. Type help for an example.');
`;
}

export async function installDrizzle(root, packageManager = detectPackageManager(root)) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const allDependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!allDependencies['drizzle-orm']) {
    await run('npx', [
      'sv@0.17.0', 'add', 'drizzle=database:sqlite+sqlite:better-sqlite3',
      '--install', packageManager, '--no-git-check'
    ], { cwd: root });
  }
  const refreshed = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const refreshedDependencies = { ...refreshed.dependencies, ...refreshed.devDependencies };
  if (!refreshedDependencies.zod) {
    const installArgs = packageManager === 'npm'
      ? ['install', 'zod']
      : packageManager === 'yarn'
        ? ['add', 'zod']
        : ['add', 'zod'];
    await run(packageManager, installArgs, { cwd: root });
  }
}

export async function initializeProject(root, options = {}) {
  const packagePath = path.join(root, 'package.json');
  if (!fs.existsSync(packagePath)) throw new Error('Run `chic init` from a SvelteKit project root.');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  if (!dependencies['@sveltejs/kit']) throw new Error('This does not look like a SvelteKit project.');

  if (!options.noInstall) await installDrizzle(root, options.packageManager);
  const existingConfig = fs.existsSync(path.join(root, 'chic.json'))
    ? readConfig(root)
    : null;
  if (existingConfig && existingConfig.orm !== 'drizzle' && !options.force) {
    throw new Error(
      'This is a legacy Sequelize project. Re-run `chic init --force` to adopt Drizzle metadata; ' +
      'existing data and generated files will not be converted automatically.'
    );
  }
  const config = {
    version: CONFIG_VERSION,
    orm: 'drizzle',
    database: 'sqlite',
    models: existingConfig?.models || [],
    components: existingConfig?.components || [],
    routes: existingConfig?.routes || []
  };
  const plan = new GenerationPlan(root, { ...options, force: true });
  plan.write('chic.json', `${JSON.stringify(config, null, 2)}\n`, { overwrite: true });
  plan.write('.chic/db.mjs', databaseRunnerTemplate(), { overwrite: true });
  plan.write('.chic/console.mjs', consoleTemplate(), { overwrite: true });
  if (!fs.existsSync(path.join(root, '.chic/seed.mjs'))) {
    plan.write('.chic/seed.mjs', `export default async function seed(db) {
  // Example: db.prepare('INSERT INTO posts (title) VALUES (?)').run('Hello Chic');
}
`);
  }
  if (options.fresh || !fs.existsSync(path.join(root, 'src/lib/server/db/schema.ts'))) {
    plan.write('src/lib/server/db/schema.ts', '// Drizzle schema exports generated by Chic.\n');
  }
  plan.write('src/routes/__chic/routes/+server.ts', routeInspector(config), { overwrite: true });

  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) {
    plan.write('.env', 'DATABASE_URL=chic.db\nCHIC_DEBUG=OFF\n');
  } else {
    let env = fs.readFileSync(envPath, 'utf8');
    if (!/^DATABASE_URL=/m.test(env)) env += `${env.endsWith('\n') ? '' : '\n'}DATABASE_URL=chic.db\n`;
    if (!/^CHIC_DEBUG=/m.test(env)) env += 'CHIC_DEBUG=OFF\n';
    plan.write('.env', env, { overwrite: true });
  }
  await plan.execute();
  return config;
}

export async function createProject(name, options = {}) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || name.includes('..')) {
    throw new Error('Invalid project name.');
  }
  const root = path.resolve(options.cwd || process.cwd(), name);
  if (fs.existsSync(root)) throw new Error(`Target already exists: ${root}`);
  const packageManager = options.packageManager || 'npm';
  const addons = ['drizzle=database:sqlite+sqlite:better-sqlite3'];
  if (options.tailwind) addons.push('tailwindcss');
  if (options.auth) addons.push('better-auth');
  if (options.playwright) addons.push('playwright');
  if (options.vitest) addons.push('vitest');
  for (const addon of options.addons || []) addons.push(addon);

  const args = [
    'sv@0.17.0', 'create', '--template', 'minimal', '--types', 'ts',
    '--add', ...addons, '--install', packageManager, name
  ];
  await run('npx', args, { cwd: options.cwd || process.cwd() });
  await initializeProject(root, { noInstall: false, packageManager, force: true, fresh: true });
  return root;
}

export async function runDatabaseCommand(root, command) {
  if (command === 'console') {
    await run(process.execPath, ['.chic/console.mjs'], { cwd: root });
    return;
  }
  if (command === 'generate') {
    const manager = detectPackageManager(root);
    const args = manager === 'npm'
      ? ['exec', 'drizzle-kit', 'generate']
      : ['exec', 'drizzle-kit', 'generate'];
    await run(manager, args, { cwd: root });
    return;
  }
  if (command === 'studio') {
    const manager = detectPackageManager(root);
    await run(manager, ['exec', 'drizzle-kit', 'studio'], { cwd: root });
    return;
  }
  if (!['migrate', 'rollback', 'reset', 'seed'].includes(command)) {
    throw new Error('Database commands: generate, migrate, rollback, reset, seed, studio, console.');
  }
  await run(process.execPath, ['.chic/db.mjs', command], { cwd: root });
}

export async function upgradeProject(root, options = {}) {
  const config = readConfig(root);
  if (config.version >= CONFIG_VERSION && config.orm === 'drizzle') {
    return { changed: false, message: 'Chic project is already current.' };
  }
  if (!options.force) {
    throw new Error(
      'Upgrading from Sequelize changes the ORM. Back up your database, then run `chic upgrade --force`. ' +
      'Chic preserves existing source files and does not migrate Sequelize data automatically.'
    );
  }
  await initializeProject(root, { ...options, force: true });
  return {
    changed: true,
    message: 'Upgraded project metadata to Drizzle. Regenerate resources after migrating existing data.'
  };
}

export function doctor(root) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  let config;
  try {
    config = readConfig(root);
    add('chic.json', true, `version ${config.version}`);
  } catch (error) {
    add('chic.json', false, error.message);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  add('SvelteKit', Boolean(deps['@sveltejs/kit']), deps['@sveltejs/kit'] || 'missing');
  add('Drizzle ORM', Boolean(deps['drizzle-orm']), deps['drizzle-orm'] || 'missing');
  add('SQLite driver', Boolean(deps['better-sqlite3']), deps['better-sqlite3'] || 'missing');
  add('Zod validation', Boolean(deps.zod), deps.zod || 'missing');
  add('Migration runner', fs.existsSync(path.join(root, '.chic/db.mjs')), '.chic/db.mjs');
  const env = fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '';
  add('DATABASE_URL', /^DATABASE_URL=.+/m.test(env), 'set in .env');
  add('Production route safety', /^CHIC_DEBUG=OFF$/m.test(env), 'CHIC_DEBUG should default to OFF');
  if (config) {
    for (const model of config.models) {
      for (const artifact of model.artifacts || []) {
        add(`${model.name}: ${artifact}`, fs.existsSync(path.join(root, artifact)), 'generated artifact');
      }
    }
  }
  return checks;
}

export function projectRoot(start = process.cwd()) {
  return findProjectRoot(start, true);
}

