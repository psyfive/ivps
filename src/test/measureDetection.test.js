import { describe, expect, it } from 'vitest';
import {
  analyzeScoreImageData,
  countMeasuresInBox,
  detectMeasureCountFromImageData,
} from '../utils/measureDetection';

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

  it('drops a full-height stem too close to a barline to form a real measure', () => {
    const imageData = makeImageData(220, 80, ctx => {
      drawStaff(ctx);
      [14, 110, 206].forEach(x => drawBarline(ctx, x));
      // 바라인(110) 바로 옆 8px 거리의 전체 높이 기둥 — 마디가 되기엔 너무 좁다
      drawVerticalMark(ctx, 118, 17, 55);
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

// 두 시스템(오선 2개) × 마디 4개 합성 페이지.
// 바라인 x = [14, 110, 206, 302, 398], 시스템 1 오선 y=20~52, 시스템 2 오선 y=120~152.
function makeTwoSystemPage() {
  return makeImageData(420, 200, ctx => {
    drawStaff(ctx, 20, 8);
    [14, 110, 206, 302, 398].forEach(x => drawBarline(ctx, x, 17, 55));
    drawStaff(ctx, 120, 8);
    [14, 110, 206, 302, 398].forEach(x => drawBarline(ctx, x, 117, 155));
  });
}

// px 박스를 0~1 정규화 좌표로 변환 (이미지 420×200 기준)
function box(left, top, right, bottom, width = 420, height = 200) {
  return {
    x: left / width,
    y: top / height,
    width: (right - left) / width,
    height: (bottom - top) / height,
  };
}

describe('global barline map analysis', () => {
  it('extracts barline coordinates for every staff system on the page', () => {
    const analysis = analyzeScoreImageData(makeTwoSystemPage());

    expect(analysis).not.toBeNull();
    expect(analysis.staves).toHaveLength(2);

    for (const staff of analysis.staves) {
      expect(staff.barlineXs).toHaveLength(5);
      [14.5, 110.5, 206.5, 302.5, 398.5].forEach((expected, i) => {
        expect(Math.abs(staff.barlineXs[i] - expected)).toBeLessThanOrEqual(2);
      });
      expect(staff.boundaries).toHaveLength(5);
    }

    expect(analysis.staves[0].topLineY).toBeLessThan(60);
    expect(analysis.staves[1].topLineY).toBeGreaterThan(110);
  });

  it('returns null when the page has no staff lines', () => {
    const imageData = makeImageData(140, 80, ctx => {
      [14, 70, 126].forEach(x => drawBarline(ctx, x));
    });

    expect(analyzeScoreImageData(imageData)).toBeNull();
  });
});

describe('countMeasuresInBox', () => {
  const analysis = analyzeScoreImageData(makeTwoSystemPage());

  it('counts measures between barlines when box edges sit on barlines', () => {
    // 바라인 14~302 위에 양끝 → 사이 마디 3개
    expect(countMeasuresInBox(analysis, box(14, 8, 302, 62))).toBe(3);
  });

  it('includes partial measures when box edges fall mid-measure with enough overlap', () => {
    // 양끝이 마디 중간(겹침 > 35%) → 부분 마디 2개 + 온전한 마디 1개 = 3
    expect(countMeasuresInBox(analysis, box(60, 8, 250, 62))).toBe(3);
  });

  it('excludes sliver measures below the overlap ratio', () => {
    // 양끝 부분 마디 겹침이 각각 ~21%, ~24% → 제외, 가운데 마디만 카운트
    expect(countMeasuresInBox(analysis, box(90, 8, 230, 62))).toBe(1);
  });

  it('sums measures across systems when the box spans two staves', () => {
    expect(countMeasuresInBox(analysis, box(14, 8, 302, 162))).toBe(6);
  });

  it('returns null when the box does not overlap any staff', () => {
    // 두 시스템 사이 여백
    expect(countMeasuresInBox(analysis, box(14, 70, 302, 100))).toBeNull();
  });

  it('ignores a staff the box only grazes vertically', () => {
    // 시스템 1은 완전히 포함, 시스템 2는 밴드의 50% 미만만 걸침
    expect(countMeasuresInBox(analysis, box(14, 8, 302, 125))).toBe(3);
  });
});
