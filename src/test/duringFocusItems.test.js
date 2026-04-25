import { describe, expect, it, vi } from 'vitest';
import { getFocusIndexes, pickRandomFocusIndexes } from '../utils/duringFocusItems';

describe('during focus item selection', () => {
  it('returns every index when there are three or fewer items', () => {
    expect(getFocusIndexes(0)).toEqual([]);
    expect(getFocusIndexes(1)).toEqual([0]);
    expect(getFocusIndexes(3)).toEqual([0, 1, 2]);
  });

  it('uses valid stored indexes in stable display order', () => {
    expect(getFocusIndexes(5, [4, 1, 3])).toEqual([1, 3, 4]);
  });

  it('falls back to the first three indexes when stored indexes are incomplete', () => {
    expect(getFocusIndexes(5, [4, 9])).toEqual([0, 1, 2]);
  });

  it('picks three random indexes for larger item sets', () => {
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.2);

    const indexes = pickRandomFocusIndexes(5);

    expect(indexes).toHaveLength(3);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(indexes.every(index => index >= 0 && index < 5)).toBe(true);

    randomSpy.mockRestore();
  });
});
