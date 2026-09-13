import { slugify, makeSpecId } from './specId.js';

describe('slugify', () => {
  it('lowercases and replaces non-alphanumerics with hyphens', () => {
    expect(slugify('My Strategy! v2.0')).toBe('my-strategy-v2-0');
  });

  it('collapses and trims runs of non-alphanumerics', () => {
    expect(slugify('  --Weird--Name--  ')).toBe('weird-name');
  });

  it('truncates to 50 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long)).toHaveLength(50);
  });

  it('returns an empty string for input with no alphanumerics', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('makeSpecId', () => {
  it('combines the slug with the first 6 hash characters', () => {
    expect(makeSpecId('My Strategy', 'abcdef1234567890')).toBe('my-strategy-abcdef');
  });

  it('is deterministic for identical inputs', () => {
    expect(makeSpecId('X', 'hash123')).toBe(makeSpecId('X', 'hash123'));
  });

  it('differs when the hash differs', () => {
    expect(makeSpecId('X', 'aaaaaa')).not.toBe(makeSpecId('X', 'bbbbbb'));
  });
});
