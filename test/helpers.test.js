
import { pluralize, singularize, capitalize, getNamespaces, transformFieldsToObject } from '../lib/helpers.js';

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
});