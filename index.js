#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import sade from 'sade';
import {
  buildControllerPlan,
  buildDestroyPlan,
  buildMigrationPlan,
  buildModelPlan,
  buildScaffoldPlan,
  buildSimplePlan,
  findProjectRoot,
  readConfig,
  renderRouteList
} from './lib/generator.js';
import {
  createProject,
  doctor,
  initializeProject,
  projectRoot,
  run,
  runDatabaseCommand,
  upgradeProject
} from './lib/project.js';
import { createSitemap } from './lib/functions.js';
import { renderInfoScreen } from './ui/infoScreen.js';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const prog = sade('chic').version(pkg.version);

function generationOptions(options) {
  return {
    dryRun: options['dry-run'],
    force: options.force,
    skip: options.skip,
    api: options.api
  };
}

function fieldsFrom(first, options) {
  return [first, ...(options._ || [])].filter(Boolean);
}

async function execute(label, callback) {
  try {
    console.log(`\n${label}`);
    await callback();
  } catch (error) {
    console.error(`\nChic error: ${error.message}`);
    process.exitCode = 1;
  }
}

function addGenerationFlags(command) {
  return command
    .option('--dry-run', 'Print changes without writing files')
    .option('--force', 'Overwrite generated files')
    .option('--skip', 'Keep files that already exist');
}

prog
  .command('new <name>')
  .describe('Create a TypeScript SvelteKit app with Drizzle and SQLite')
  .option('--package-manager', 'Package manager: npm, pnpm, yarn, or bun', 'npm')
  .option('--tailwind', 'Add Tailwind CSS')
  .option('--auth', 'Add Better Auth')
  .option('--playwright', 'Add Playwright')
  .option('--vitest', 'Add Vitest')
  .option('--add', 'Additional sv add-ons, comma separated')
  .example('new bookstore --tailwind --auth')
  .action((name, options) => execute(`Creating ${name}`, async () => {
    const root = await createProject(name, {
      packageManager: options['package-manager'],
      tailwind: options.tailwind,
      auth: options.auth,
      playwright: options.playwright,
      vitest: options.vitest,
      addons: options.add ? String(options.add).split(',').filter(Boolean) : []
    });
    console.log(`\nReady: ${root}`);
    console.log(`  cd ${name}`);
    console.log('  chic generate scaffold Book title:string author:string');
    console.log('  chic db migrate');
    console.log('  chic server');
  }));

prog
  .command('init')
  .describe('Initialize Chic with Drizzle in an existing SvelteKit project')
  .option('--no-install', 'Do not install Drizzle and Zod')
  .option('--force', 'Adopt Drizzle metadata in a legacy Chic project')
  .option('--package-manager', 'Package manager to use')
  .action((options) => execute('Initializing Chic', async () => {
    const root = findProjectRoot(process.cwd(), false);
    await initializeProject(root, {
      noInstall: options.install === false,
      force: options.force,
      packageManager: options['package-manager']
    });
    console.log('Chic initialized with Drizzle + SQLite.');
  }));

const generate = addGenerationFlags(
  prog
    .command('generate <kind> <name> [field]')
    .describe('Generate a scaffold, model, route, component, or migration')
    .option('--api', 'API mode for scaffolds: rest, remote, or none', 'rest')
    .option('--sql', 'Initial SQL for a custom migration')
    .example('generate scaffold Post title:string published:boolean:index')
    .example('generate model Comment body:text post:references')
    .example('generate route /about')
);

generate.action((kind, name, field, options) => execute(`Generating ${kind} ${name}`, async () => {
  const root = projectRoot();
  let built;
  if (kind === 'from') {
    const sourcePath = path.resolve(root, name);
    const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    if (!Array.isArray(source.models)) throw new Error('Config file must contain a models array.');
    for (const model of source.models) {
      const tokens = model.fields.map((entry) => {
        const modifiers = [
          entry.required === false ? 'optional' : null,
          entry.unique ? 'unique' : null,
          entry.index ? 'index' : null
        ].filter(Boolean);
        return `${entry.name}:${entry.type || 'string'}${modifiers.length ? `:${modifiers.join(',')}` : ''}`;
      });
      const generated = buildScaffoldPlan(root, model.name, tokens, {
        ...generationOptions(options),
        api: model.api || options.api
      });
      await generated.plan.execute();
    }
    console.log(`Generated ${source.models.length} resources.`);
    return;
  } else if (kind === 'scaffold' || kind === 'resource') {
    built = buildScaffoldPlan(root, name, fieldsFrom(field, options), generationOptions(options));
  } else if (kind === 'model') {
    built = buildModelPlan(root, name, fieldsFrom(field, options), generationOptions(options));
  } else if (kind === 'controller' || kind === 'service') {
    built = buildControllerPlan(root, name, generationOptions(options));
  } else if (kind === 'route' || kind === 'component') {
    built = buildSimplePlan(root, kind, name, generationOptions(options));
  } else if (kind === 'migration') {
    built = buildMigrationPlan(root, name, options.sql, generationOptions(options));
  } else {
    throw new Error('Generators: scaffold, model, controller, route, component, migration, from.');
  }
  await built.plan.execute();
  if (built.names) {
    console.log(`\nVisit /${built.names.plural}`);
    console.log('Run `chic db migrate` to apply the generated migration.');
  }
}));

addGenerationFlags(
  prog
    .command('make <name> [field]')
    .describe('Alias for `generate scaffold`')
    .option('--api', 'API mode: rest, remote, or none', 'rest')
    .example('make Book title:string author:string')
).action((name, field, options) => execute(`Scaffolding ${name}`, async () => {
  const built = buildScaffoldPlan(
    projectRoot(),
    name,
    fieldsFrom(field, options),
    generationOptions(options)
  );
  await built.plan.execute();
  console.log(`\nVisit /${built.names.plural} after running \`chic db migrate\`.`);
}));

addGenerationFlags(
  prog
    .command('destroy <kind> <name>')
    .describe('Reverse a generated scaffold or model')
    .example('destroy scaffold Book')
).action((kind, name, options) => execute(`Destroying ${kind} ${name}`, async () => {
  if (!['scaffold', 'resource', 'model'].includes(kind)) {
    throw new Error('Destroy supports scaffold, resource, or model.');
  }
  const built = buildDestroyPlan(projectRoot(), name, generationOptions(options));
  await built.plan.execute();
}));

prog
  .command('add <what>')
  .describe('Add a route (/about) or component (ContactForm)')
  .option('--dry-run', 'Print changes without writing files')
  .option('--force', 'Overwrite generated files')
  .option('--skip', 'Keep existing files')
  .action((what, options) => execute(`Adding ${what}`, async () => {
    const kind = what.startsWith('/') ? 'route' : 'component';
    const built = buildSimplePlan(projectRoot(), kind, what, generationOptions(options));
    await built.plan.execute();
  }));

prog
  .command('db <command>')
  .describe('Database: generate, migrate, rollback, reset, seed, studio, console')
  .example('db migrate')
  .example('db rollback')
  .action((command) => execute(`Database ${command}`, async () => {
    await runDatabaseCommand(projectRoot(), command);
  }));

prog
  .command('routes')
  .describe('List registered routes')
  .action(() => execute('Routes', async () => {
    const config = readConfig(projectRoot());
    console.log(renderRouteList(config) || 'No routes registered.');
    console.log('\nBrowser inspector: /__chic/routes');
  }));

prog
  .command('debug <command>')
  .describe('Show or set the production route inspector flag')
  .action((command) => execute(`Debug ${command}`, async () => {
    const root = projectRoot();
    const envPath = path.join(root, '.env');
    let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const current = env.match(/^CHIC_DEBUG=(.+)$/m)?.[1] || 'OFF';
    if (command.toLowerCase() === 'status') {
      console.log(`CHIC_DEBUG=${current}`);
      return;
    }
    const value = command.toUpperCase();
    if (!['ON', 'OFF'].includes(value)) throw new Error('Use: chic debug status|ON|OFF');
    env = /^CHIC_DEBUG=/m.test(env)
      ? env.replace(/^CHIC_DEBUG=.*$/m, `CHIC_DEBUG=${value}`)
      : `${env}${env && !env.endsWith('\n') ? '\n' : ''}CHIC_DEBUG=${value}\n`;
    fs.writeFileSync(envPath, env);
    console.log(`CHIC_DEBUG=${value}`);
  }));

prog
  .command('doctor')
  .describe('Check project health and generated artifacts')
  .action(() => execute('Chic doctor', async () => {
    const checks = doctor(projectRoot());
    for (const check of checks) {
      console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
    }
    if (checks.some((check) => !check.ok)) process.exitCode = 1;
  }));

prog
  .command('upgrade')
  .describe('Upgrade Chic project metadata and Drizzle tooling')
  .option('--force', 'Confirm migration from legacy Sequelize metadata')
  .action((options) => execute('Upgrading Chic', async () => {
    const result = await upgradeProject(projectRoot(), { force: options.force });
    console.log(result.message);
  }));

prog
  .command('sitemap <url>')
  .describe('Generate static/sitemap.xml from source routes')
  .action((url) => execute('Generating sitemap', async () => {
    await createSitemap(url);
  }));

prog
  .command('server')
  .describe('Start the SvelteKit development server')
  .option('--open', 'Open the app in a browser')
  .action((options) => execute('Starting development server', async () => {
    const manager = (await import('./lib/project.js')).detectPackageManager(projectRoot());
    const args = manager === 'npm'
      ? ['run', 'dev', '--', ...(options.open ? ['--open'] : [])]
      : ['run', 'dev', ...(options.open ? ['--open'] : [])];
    await run(manager, args, { cwd: projectRoot() });
  }));

prog
  .command('s')
  .describe('Alias for `chic server`')
  .action(() => execute('Starting development server', async () => {
    const { detectPackageManager } = await import('./lib/project.js');
    const root = projectRoot();
    await run(detectPackageManager(root), ['run', 'dev'], { cwd: root });
  }));

prog
  .command('*', '', { default: true })
  .action(() => {
    console.log(renderInfoScreen(pkg.version));
  });

prog.parse(process.argv);
