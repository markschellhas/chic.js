import fs from 'node:fs';

describe('release version', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

  it('keeps package and lockfile versions aligned', () => {
    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages[''].version).toBe(packageJson.version);
  });

  it('exposes the chic CLI from a valid bin filename', () => {
    expect(packageJson.bin.chic).toBe('bin/chic.js');
    expect(packageLock.packages[''].bin.chic).toBe('bin/chic.js');
    expect(fs.existsSync(packageJson.bin.chic)).toBe(true);
    expect(fs.readFileSync(packageJson.bin.chic, 'utf8')).toMatch(/^#!/);
  });

  it('has a dated changelog entry for the package release', () => {
    expect(changelog).toMatch(
      new RegExp(`^## \\[${packageJson.version.replaceAll('.', '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm')
    );
    expect(changelog).not.toContain(`## [${packageJson.version}] - Unreleased`);
  });
});
