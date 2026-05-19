import { describe, expect, it, vi } from 'vitest';
import {
  getFocusIndexes,
  getFocusItems,
  parseDuringFocusItem,
  pickRandomFocusIndexes,
} from '../utils/duringFocusItems';

const taggedItems = [
  '[모양 확인] 손목이 둥근가?',
  '[모양 확인] 손가락이 준비되어 있는가?',
  '[느낌 확인] 힘이 빠져 있는가?',
  '[느낌 확인] 접촉감이 가벼운가?',
  '[소리 확인] 공명이 열려 있는가?',
  '[소리 확인] 잡음이 없는가?',
];

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

  it('parses category labels without keeping them in the item text', () => {
    expect(parseDuringFocusItem('[모양 확인] 손목이 둥근가?')).toEqual({
      category: 'shape',
      label: '모양 확인',
      text: '손목이 둥근가?',
    });
  });

  it('returns one item for shape, feel, and sound by default', () => {
    const focusItems = getFocusItems(taggedItems);

    expect(focusItems.map(item => item.category)).toEqual(['shape', 'feel', 'sound']);
    expect(focusItems.map(item => item.text)).toEqual([
      '손목이 둥근가?',
      '힘이 빠져 있는가?',
      '공명이 열려 있는가?',
    ]);
  });

  it('keeps stored indexes only when all three categories are represented', () => {
    expect(getFocusIndexes(taggedItems, [1, 3, 5])).toEqual([1, 3, 5]);
    expect(getFocusIndexes(taggedItems, [0, 1, 2])).toEqual([0, 2, 4]);
  });

  it('picks one random index from each category', () => {
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9);

    expect(pickRandomFocusIndexes(taggedItems)).toEqual([1, 3, 5]);

    randomSpy.mockRestore();
  });

  it('does not repeat the previous item in each category when alternatives exist', () => {
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const previous = [0, 2, 4];
    const next = pickRandomFocusIndexes(taggedItems, previous);

    expect(next).toEqual([1, 3, 5]);

    randomSpy.mockRestore();
  });

  it('keeps a category only when that category has no alternative', () => {
    const oneShape = [taggedItems[0], taggedItems[2], taggedItems[3], taggedItems[4], taggedItems[5]];
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    expect(pickRandomFocusIndexes(oneShape, [0, 1, 3])).toEqual([0, 2, 4]);

    randomSpy.mockRestore();
  });

  it('keeps the only available checklist when every category has no alternative', () => {
    const oneCombination = [taggedItems[0], taggedItems[2], taggedItems[4]];

    expect(pickRandomFocusIndexes(oneCombination, [0, 1, 2])).toEqual([0, 1, 2]);
  });
});
