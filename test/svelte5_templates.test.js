import { compile } from 'svelte/compiler';

import {
  destroyButtonTemplate,
  generateFormComponentTemplate
} from '../lib/templates/component_templates.js';
import { routePageTemplate } from '../lib/templates/page_templates.js';
import {
  contentReplaceEditFormPage,
  contentReplaceIndexPage,
  contentReplaceNewFormPage,
  contentReplaceShowPage
} from '../lib/templates/template_utils.js';

function compileSvelte(source, filename) {
  return compile(source, {
    filename,
    generate: false,
    modernAst: true
  });
}

describe('Svelte 5 templates', () => {
  it('compiles the generated form component in runes mode', () => {
    const source = generateFormComponentTemplate(
      'title:string description:text cover:file'
    );

    expect(() => compileSvelte(source, 'Form.svelte')).not.toThrow();
  });

  it('compiles the generated destroy button with event attributes', () => {
    expect(() =>
      compileSvelte(destroyButtonTemplate, 'DestroyButton.svelte')
    ).not.toThrow();
  });

  it.each([
    ['index', contentReplaceIndexPage(routePageTemplate, 'posts', 'title')],
    ['new', contentReplaceNewFormPage(routePageTemplate, 'posts')],
    ['show', contentReplaceShowPage(routePageTemplate, 'posts')],
    ['edit', contentReplaceEditFormPage(routePageTemplate, 'posts')]
  ])('compiles the generated %s page in runes mode', (_, source) => {
    expect(() => compileSvelte(source, '+page.svelte')).not.toThrow();
  });
});
