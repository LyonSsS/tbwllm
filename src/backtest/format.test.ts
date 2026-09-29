import { pct, ipct, boxTable, mdTable } from './format.js';

describe('pct', () => {
  it('formats positive and negative values with a unicode minus', () => {
    expect(pct(12.34)).toBe('+12.3%');
    expect(pct(-4.5)).toBe('−4.5%');
    expect(pct(0)).toBe('+0.0%');
  });
});

describe('ipct', () => {
  it('rounds to the nearest integer', () => {
    expect(ipct(12.6)).toBe('+13%');
    expect(ipct(-4.4)).toBe('−4%');
  });
});

describe('boxTable', () => {
  it('renders a bordered table with column 1 left-aligned and others right-aligned', () => {
    const out = boxTable(['#', 'name', 'val'], [['1', 'abc', '10'], ['2', 'de', '5']]);
    const lines = out.split('\n');
    expect(lines[0]).toBe('┌───┬──────┬─────┐');
    expect(lines).toContain('│ 1 │ abc  │  10 │');
    expect(lines).toContain('│ 2 │ de   │   5 │');
  });
});

describe('mdTable', () => {
  it('right-aligns every column except column 1', () => {
    const out = mdTable(['#', 'name', 'val'], [['1', 'abc', '10']]);
    const lines = out.split('\n');
    expect(lines[1]).toBe('|---:|---|---:|');
    expect(lines[2]).toBe('| 1 | abc | 10 |');
  });
});
