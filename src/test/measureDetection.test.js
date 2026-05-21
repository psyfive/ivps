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

function drawStaff({ setBlack, width }, yStart = 20, gap = 8, xStart = 4) {
  for (let line = 0; line < 5; line += 1) {
    const y = yStart + (line * gap);
    for (let x = xStart; x < width - 4; x += 1) {
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

function drawThickBarline(ctx, x, width = 4, yStart = 17, yEnd = 55) {
  for (let dx = 0; dx < width; dx += 1) {
    drawBarline(ctx, x + dx, yStart, yEnd);
  }
}

function drawVerticalMark({ setBlack }, x, yStart, yEnd) {
  for (let y = yStart; y <= yEnd; y += 1) {
    setBlack(x, y);
    setBlack(x + 1, y);
  }
}

function drawRect({ setBlack }, xStart, yStart, width, height) {
  for (let y = yStart; y < yStart + height; y += 1) {
    for (let x = xStart; x < xStart + width; x += 1) {
      setBlack(x, y);
    }
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

  it('counts six measures from seven staff-aligned barlines', () => {
    const imageData = makeImageData(360, 80, ctx => {
      drawStaff(ctx);
      [12, 66, 120, 174, 228, 282, 348].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(6);
  });

  it('uses the left crop edge as a virtual boundary when a staff starts without an opening barline', () => {
    const imageData = makeImageData(420, 80, ctx => {
      drawStaff(ctx);
      [60, 112, 164, 216, 268, 320, 392].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(7);
  });

  it('does not add a virtual left boundary when the staff does not reach the crop edge', () => {
    const imageData = makeImageData(420, 80, ctx => {
      drawStaff(ctx, 20, 8, 36);
      [60, 112, 164, 216, 268, 320, 392].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(6);
  });

  it('does not count note stems that do not span the full staff', () => {
    const imageData = makeImageData(220, 80, ctx => {
      drawStaff(ctx);
      [14, 110, 206].forEach(x => drawBarline(ctx, x));
      [38, 54, 72, 132, 150, 168].forEach(x => drawVerticalMark(ctx, x, 24, 48));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });

  it('ignores short accidental-like vertical marks near only one staff edge', () => {
    const imageData = makeImageData(220, 80, ctx => {
      drawStaff(ctx);
      [14, 110, 206].forEach(x => drawBarline(ctx, x));
      [40, 58, 76].forEach(x => drawVerticalMark(ctx, x, 18, 39));
      [136, 154, 172].forEach(x => drawVerticalMark(ctx, x, 34, 56));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });

  it('does not count a full-height stem with an attached notehead', () => {
    const imageData = makeImageData(220, 80, ctx => {
      drawStaff(ctx);
      [14, 110, 206].forEach(x => drawBarline(ctx, x));
      drawVerticalMark(ctx, 58, 17, 55);
      drawRect(ctx, 62, 47, 8, 6);
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });

  it('does not count a full-height stem with an attached beam', () => {
    const imageData = makeImageData(220, 80, ctx => {
      drawStaff(ctx);
      [14, 110, 206].forEach(x => drawBarline(ctx, x));
      drawVerticalMark(ctx, 58, 17, 55);
      drawRect(ctx, 46, 16, 26, 3);
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });

  it('keeps thick staff-aligned barlines as barlines', () => {
    const imageData = makeImageData(180, 80, ctx => {
      drawStaff(ctx);
      [14, 90, 162].forEach(x => drawThickBarline(ctx, x));
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
