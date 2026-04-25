import { describe, expect, it } from 'vitest';
import { fitContainedSize } from '../utils/scorePageFit';

describe('fitContainedSize', () => {
  it('fits a portrait page inside a landscape tablet box', () => {
    const result = fitContainedSize(1000, 1400, 1024, 768);
    expect(result.width).toBeCloseTo(548.57, 2);
    expect(result.height).toBe(768);
  });

  it('fits a landscape page inside a portrait tablet box', () => {
    const result = fitContainedSize(1400, 1000, 768, 1024);
    expect(result.width).toBe(768);
    expect(result.height).toBeCloseTo(548.57, 2);
  });

  it('uses the whole box when the aspect ratio matches', () => {
    const result = fitContainedSize(4, 3, 800, 600);
    expect(result).toEqual({ width: 800, height: 600, scale: 200 });
  });

  it('returns a zero fit for missing dimensions', () => {
    expect(fitContainedSize(0, 100, 800, 600)).toEqual({ width: 0, height: 0, scale: 0 });
    expect(fitContainedSize(100, 100, 0, 600)).toEqual({ width: 0, height: 0, scale: 0 });
  });

  it('can avoid upscaling when requested', () => {
    const result = fitContainedSize(200, 100, 800, 600, { allowUpscale: false });
    expect(result).toEqual({ width: 200, height: 100, scale: 1 });
  });
});
