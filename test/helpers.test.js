
import { pluralize, singularize, capitalize, getNamespaces, transformFieldsToObject, styledBy, transformYamlModelsAndFields } from '../lib/helpers.js';

describe('pluralize', () => {
  it('should add an "s" to the end of a word if it does not already end in "s"', () => {
    expect(pluralize('cat')).toBe('cats');
  });

  it('should not add an "s" to the end of a word if it already ends in "s"', () => {
    expect(pluralize('dogs')).toBe('dogs');
  });
});

describe('singularize', () => {
  it('should remove the "s" from the end of a word if it ends in "s"', () => {
    expect(singularize('cats')).toBe('cat');
  });

  it('should not remove the "s" from the end of a word if it does not end in "s"', () => {
    expect(singularize('dog')).toBe('dog');
  });
});

describe('capitalize', () => {
  it('should capitalize the first letter of a word', () => {
    expect(capitalize('hello')).toBe('Hello');
  });
});

describe('getNamespaces', () => {
  it('should return an object with the pluralized name, singular name, and capitalized name', () => {
    expect(getNamespaces('User')).toEqual({
      name: 'users',
      nameSingular: 'user',
      nameCapitalized: 'Users'
    });
  });
});

describe('transformFieldsToObject', () => {
  it('should transform a string of fields into an array of objects with name and type properties', () => {
    expect(transformFieldsToObject('name:string age:number')).toEqual([
      { name: 'name', type: 'string' },
      { name: 'age', type: 'number' }
    ]);
  });
  it('should automatically make type string if fields does not include a colon', () => {
    expect(transformFieldsToObject('name color')).toEqual([
      { name: 'name', type: 'string' },
      { name: 'color', type: 'string' }
    ]);
  });
});

describe("styledBy", () => {
  it("should return an array containing a truthy boolean value and a string", () => {
      const options = { _: [ 'styled', 'by', 'tailwind' ] };
      const result = styledBy(options);
      expect(result).toEqual([true, 'tailwind', 'npx svelte-add tailwindcss', 'https://github.com/svelte-add/tailwindcss']);
  });
  
  it("should return an array containing a truthy boolean value and a string when styled with is used", () => {
      const options = { _: [ 'styled', 'with', 'tailwind' ] };
      const result = styledBy(options);
      expect(result).toEqual([true, 'tailwind', 'npx svelte-add tailwindcss', 'https://github.com/svelte-add/tailwindcss']);
  });

  it("should return an array containing a false boolean and empty strings when there are no options", () => {
    const options = { _: [] };
    const result = styledBy(options);
    expect(result).toEqual([false, '', '', '']);
  });
  
  it("should return an array containing a false boolean and empty strings when styled by value is not recognised.", () => {
    const options = { _: [ 'styled', 'by', 'headwind' ] };
    const result = styledBy(options);
    expect(result).toEqual([false, '', '', '']);
  });
  
  it("should return an array containing a false boolean and empty strings when styled by value is not present.", () => {
    const options = { _: [ 'styled', 'by' ] };
    const result = styledBy(options);
    expect(result).toEqual([false, '', '', '']);
  });
  
  it("should return an array containing a false boolean and empty strings when styled by value is not present.", () => {
    const options = { _: [ 'styled' ] };
    const result = styledBy(options);
    expect(result).toEqual([false, '', '', '']);
  });
  
  it("should return an array containing a false boolean and empty strings when styled by value is not present.", () => {
    const options = { _: [ 'styled' ] };
    const result = styledBy(options);
    expect(result).toEqual([false, '', '', '']);
  });
  
  it("should return an array containing a false boolean and empty strings when prompt is not recognised.", () => {
    const options = { _: [ 'styled', 'in', 'tailwind' ] };
    const result = styledBy(options);
    expect(result).toEqual([false, '', '', '']);
  });

});