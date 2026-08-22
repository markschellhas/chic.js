import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { doctor, initializeProject } from '../lib/project.js';

describe('project setup', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chic-project-'));
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      type: 'module',
      dependencies: {
        '@sveltejs/kit': 'latest',
        'better-sqlite3': 'latest',
        'drizzle-orm': 'latest',
        zod: 'latest'
      }
    }));
    fs.writeFileSync(path.join(root, 'svelte.config.js'), 'export default {};\n');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('initializes a safe Drizzle project without overwriting hooks', async () => {
    fs.writeFileSync(path.join(root, 'src/hooks.server.ts'), 'export const handle = custom;\n');
    await initializeProject(root, { noInstall: true });

    const config = JSON.parse(fs.readFileSync(path.join(root, 'chic.json'), 'utf8'));
    expect(config).toMatchObject({ version: 2, orm: 'drizzle', database: 'sqlite' });
    expect(fs.readFileSync(path.join(root, 'src/hooks.server.ts'), 'utf8')).toContain('custom');
    expect(fs.readFileSync(path.join(root, '.env'), 'utf8')).toContain('CHIC_DEBUG=OFF');
    expect(fs.existsSync(path.join(root, '.chic/db.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/routes/__chic/routes/+server.ts'))).toBe(true);
  });

  it('reports a healthy initialized project', async () => {
    await initializeProject(root, { noInstall: true });
    const checks = doctor(root);
    expect(checks.every((check) => check.ok)).toBe(true);
  });
});

