import { containsPattern, escapeLike, resolveSort } from './list-query';

describe('list-query helpers', () => {
  it('escapes LIKE wildcards and backslashes', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('c:\\x')).toBe('c:\\\\x');
    expect(containsPattern('100%')).toBe('%100\\%%');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeLike('laptop')).toBe('laptop');
  });

  it('only sorts by whitelisted columns', () => {
    const allowed = ['name', 'createdAt'];
    expect(resolveSort('name', 'ASC', allowed, 'createdAt')).toEqual({
      column: 'name',
      order: 'ASC',
    });
    expect(resolveSort('id; DROP TABLE x', 'ASC', allowed, 'createdAt')).toEqual({
      column: 'createdAt',
      order: 'ASC',
    });
  });

  it('defaults to DESC for anything but ASC', () => {
    expect(resolveSort(undefined, 'sideways', ['a'], 'a').order).toBe('DESC');
    expect(resolveSort(undefined, 'asc', ['a'], 'a').order).toBe('ASC');
  });
});
