import fs from 'fs';

import {
  APIIndexRouteTemplate,
  APIItemRouteTemplate
} from '../lib/templates/api_endpoint_templates.js';

describe('SvelteKit scaffold integration', () => {
  it('imports the routes table using the filename written by init', () => {
    const functionsSource = fs.readFileSync(
      'lib/functions.js',
      'utf8'
    );
    const hooksTemplate = fs.readFileSync(
      'lib/templates/hooks_server_template.txt',
      'utf8'
    );
    const outputFilename = functionsSource.match(
      /newFilePath = path\.join\(projectRoot, 'src', '([^']+)'\)/
    )?.[1];
    const importedFilename = hooksTemplate.match(
      /import \{ RoutesTable \} from '\.\/([^']+)'/
    )?.[1];

    expect(outputFilename).toBe('RouteTable.js');
    expect(importedFilename).toBe(outputFilename);
    expect(hooksTemplate).toContain("from '$env/dynamic/private'");
  });

  it('generates handlers that parse request JSON', () => {
    expect(APIIndexRouteTemplate('posts')).toContain(
      'const body = await request.json();'
    );
    expect(APIItemRouteTemplate('posts')).toContain(
      'const body = await request.json();'
    );
  });

  it('passes an object to the generated destroy controller', () => {
    expect(APIItemRouteTemplate('posts')).toContain(
      'const post = await destroyPost({ id });'
    );
  });
});
