import { describe, expect, it } from 'vitest';
import { detectMeasureCountFromImageData } from '../utils/measureDetection';

function makeImageData(width, height, draw) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  const setBlack = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = ((y * width) + x) * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
  };

  draw({ setBlack, width, height });
  return { data, width, height };
}

function drawStaff({ setBlack, width }, yStart = 20, gap = 8) {
  for (let line = 0; line < 5; line += 1) {
    const y = yStart + (line * gap);
    for (let x = 4; x < width - 4; x += 1) {
      setBlack(x, y);
      setBlack(x, y + 1);
    }
  }
}

function drawBarline({ setBlack }, x, yStart = 17, yEnd = 55) {
  for (let y = yStart; y <= yEnd; y += 1) {
    setBlack(x, y);
    setBlack(x + 1, y);
  }
}

describe('measure detection', () => {
  it('counts two measures from five staff lines and three barlines', () => {
    const imageData = makeImageData(140, 80, ctx => {
      drawStaff(ctx);
      [14, 70, 126].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });

  it('merges close duplicate vertical noise into one barline', () => {
    const imageData = makeImageData(160, 80, ctx => {
      drawStaff(ctx);
      [16, 80, 82, 144].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });

  it('returns null when no staff lines are found', () => {
    const imageData = makeImageData(140, 80, ctx => {
      [14, 70, 126].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBeNull();
  });
});
