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

function drawSystemStartMarker(ctx, x = 14, yStart = 13, yEnd = 60) {
  drawVerticalMark(ctx, x, yStart, yEnd);
  drawVerticalMark(ctx, x + 4, yStart + 4, yEnd - 4);
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

  it('uses a staff start inside the left area as a virtual boundary without an opening barline', () => {
    const imageData = makeImageData(420, 80, ctx => {
      drawSystemStartMarker(ctx);
      drawStaff(ctx, 20, 8, 36);
      [60, 112, 164, 216, 268, 320, 392].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(7);
  });

  it('keeps system-start measure count stable when only the right crop padding changes', () => {
    const narrowImage = makeImageData(260, 80, ctx => {
      drawSystemStartMarker(ctx);
      drawStaff(ctx, 20, 8, 36);
      [72, 124, 176, 236].forEach(x => drawBarline(ctx, x));
    });
    const wideImage = makeImageData(420, 80, ctx => {
      drawSystemStartMarker(ctx);
      drawStaff(ctx, 20, 8, 36);
      [72, 124, 176, 236].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(narrowImage)).toBe(4);
    expect(detectMeasureCountFromImageData(wideImage)).toBe(4);
  });

  it('does not add a virtual left boundary when the staff starts too far into the crop', () => {
    const imageData = makeImageData(420, 80, ctx => {
      drawSystemStartMarker(ctx, 88);
      drawStaff(ctx, 20, 8, 140);
      [164, 216, 268, 320, 392].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(4);
  });

  it('does not duplicate the virtual boundary when a real barline is near the staff start', () => {
    const imageData = makeImageData(420, 80, ctx => {
      drawStaff(ctx, 20, 8, 36);
      drawRect(ctx, 12, 8, 8, 6);
      drawRect(ctx, 20, 58, 14, 4);
      [42, 112, 164, 216, 268, 320, 392].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(6);
  });

  it('keeps a right-edge partial barline in the count', () => {
    const imageData = makeImageData(180, 80, ctx => {
      drawStaff(ctx);
      [14, 90, 179].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
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

  it('counts one measure from two barlines bounding a single measure', () => {
    const imageData = makeImageData(100, 80, ctx => {
      drawStaff(ctx);
      [14, 86].forEach(x => drawBarline(ctx, x));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(1);
  });

  it('counts two measures correctly when staff gap is larger (gap=12)', () => {
    // gap=12 → staffHeight ≈ 48, barline yStart=17 yEnd=67 → scale invariance check
    const imageData = makeImageData(200, 100, ctx => {
      drawStaff(ctx, 20, 12);
      [14, 100, 186].forEach(x => drawBarline(ctx, x, 17, 68));
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });

  it('does not count a clef-like tall mark that extends beyond the staff boundary', () => {
    const imageData = makeImageData(220, 100, ctx => {
      drawStaff(ctx);
      // real barlines
      [14, 110, 206].forEach(x => drawBarline(ctx, x));
      // clef-like mark: y=2 to y=72, well outside the tolerance window
      drawVerticalMark(ctx, 60, 2, 72);
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });

  it('still counts a barline that has a single-pixel ink dropout gap', () => {
    const imageData = makeImageData(220, 80, ctx => {
      drawStaff(ctx);
      [14, 206].forEach(x => drawBarline(ctx, x));
      // barline at x=110 with a 1-pixel gap at y=36
      for (let y = 17; y <= 55; y += 1) {
        if (y === 36) continue;
        ctx.setBlack(110, y);
        ctx.setBlack(111, y);
      }
    });

    expect(detectMeasureCountFromImageData(imageData)).toBe(2);
  });
});
