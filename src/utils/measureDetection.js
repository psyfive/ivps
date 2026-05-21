const DEFAULT_OPTIONS = {
  minStaffLineRatio: 0.08,
  staffLineThresholdRatio: 0.35,
  staffGapTolerance: 0.28,
  barlineHeightRatio: 0.42,
  barlineThresholdRatio: 0.55,
  barlineCoverageRatio: 0.82,
  barlineEndpointToleranceRatio: 0.45,
  barlineMaxGapRatio: 0.18,
  barlineMaxWidthRatio: 1.25,
  mergeDistanceRatio: 0.012,
};

function luminanceAt(data, offset) {
  return (data[offset] * 0.299) + (data[offset + 1] * 0.587) + (data[offset + 2] * 0.114);
}

function buildDarkMask(imageData) {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < data.length; i += 4) {
    const lum = luminanceAt(data, i);
    sum += lum;
    sumSq += lum * lum;
  }

  const mean = sum / pixelCount;
  const variance = Math.max(0, (sumSq / pixelCount) - (mean * mean));
  const std = Math.sqrt(variance);
  const threshold = Math.max(35, Math.min(210, mean - (std * 0.35)));
  const mask = new Uint8Array(pixelCount);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    mask[p] = luminanceAt(data, i) <= threshold ? 1 : 0;
  }

  return mask;
}

function collectRuns(values, threshold) {
  const runs = [];
  let start = -1;
  let strength = 0;

  values.forEach((value, index) => {
    if (value >= threshold) {
      if (start === -1) start = index;
      strength += value;
      return;
    }

    if (start !== -1) {
      runs.push({ start, end: index - 1, strength });
      start = -1;
      strength = 0;
    }
  });

  if (start !== -1) runs.push({ start, end: values.length - 1, strength });
  return runs;
}

function runCenter(run) {
  return (run.start + run.end) / 2;
}

function findBestStaffLineGroup(rowRatios, options) {
  const maxRatio = Math.max(...rowRatios);
  const threshold = Math.max(options.minStaffLineRatio, maxRatio * options.staffLineThresholdRatio);
  const runs = collectRuns(rowRatios, threshold)
    .map(run => ({ ...run, center: runCenter(run) }))
    .filter(run => run.end - run.start <= Math.max(4, rowRatios.length * 0.025));

  if (runs.length < 5) return null;

  let best = null;
  for (let i = 0; i <= runs.length - 5; i += 1) {
    const group = runs.slice(i, i + 5);
    const gaps = group.slice(1).map((run, idx) => run.center - group[idx].center);
    const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    if (averageGap < 2) continue;

    const maxDeviation = Math.max(...gaps.map(gap => Math.abs(gap - averageGap) / averageGap));
    if (maxDeviation > options.staffGapTolerance) continue;

    const strength = group.reduce((sum, run) => sum + run.strength, 0);
    if (!best || strength > best.strength) {
      best = { lines: group, averageGap, strength };
    }
  }

  return best;
}

function mergeCloseBarlineRuns(runs, width, options) {
  const maxDistance = Math.max(2, Math.round(width * options.mergeDistanceRatio));
  const merged = [];

  runs.forEach(run => {
    const previous = merged[merged.length - 1];
    if (previous && run.start - previous.end <= maxDistance) {
      previous.end = Math.max(previous.end, run.end);
      previous.strength += run.strength;
      return;
    }
    merged.push({ ...run });
  });

  return merged;
}

function hasDarkPixelInRun(mask, width, run, y) {
  for (let x = run.start; x <= run.end; x += 1) {
    if (mask[(y * width) + x]) return true;
  }
  return false;
}

function findVerticalStroke(mask, width, run, yStart, yEnd, maxGap) {
  const strokes = [];
  let start = -1;
  let end = -1;
  let gap = 0;
  let darkRows = 0;

  for (let y = yStart; y <= yEnd; y += 1) {
    const hasDark = hasDarkPixelInRun(mask, width, run, y);

    if (hasDark) {
      if (start === -1) start = y;
      end = y;
      gap = 0;
      darkRows += 1;
      continue;
    }

    if (start === -1) continue;

    gap += 1;
    if (gap > maxGap) {
      strokes.push({ start, end, darkRows });
      start = -1;
      end = -1;
      gap = 0;
      darkRows = 0;
    }
  }

  if (start !== -1) strokes.push({ start, end, darkRows });
  if (strokes.length === 0) return null;

  return strokes.reduce((best, stroke) => {
    if (!best) return stroke;
    return stroke.darkRows > best.darkRows ? stroke : best;
  }, null);
}

function isStaffAlignedBarline(run, staff, mask, width, height, options) {
  const runWidth = run.end - run.start + 1;
  const maxRunWidth = Math.max(4, Math.round(staff.averageGap * options.barlineMaxWidthRatio));
  if (runWidth > maxRunWidth) return false;

  const topLine = staff.lines[0].center;
  const bottomLine = staff.lines[4].center;
  const staffHeight = Math.max(1, bottomLine - topLine);
  const endpointTolerance = Math.max(2, Math.round(staff.averageGap * options.barlineEndpointToleranceRatio));
  const maxGap = Math.max(0, Math.round(staff.averageGap * options.barlineMaxGapRatio));
  const yStart = Math.max(0, Math.floor(topLine - endpointTolerance));
  const yEnd = Math.min(height - 1, Math.ceil(bottomLine + endpointTolerance));
  const stroke = findVerticalStroke(mask, width, run, yStart, yEnd, maxGap);

  if (!stroke) return false;

  const minCoverage = staffHeight * options.barlineCoverageRatio;
  return (
    stroke.start >= topLine - endpointTolerance &&
    stroke.start <= topLine + endpointTolerance &&
    stroke.end >= bottomLine - endpointTolerance &&
    stroke.end <= bottomLine + endpointTolerance &&
    stroke.darkRows >= minCoverage
  );
}

export function detectMeasureCountFromImageData(imageData, options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const { width, height } = imageData ?? {};

  if (!imageData?.data || width < 20 || height < 20) {
    return null;
  }

  const mask = buildDarkMask(imageData);
  const rowRatios = Array.from({ length: height }, (_, y) => {
    let dark = 0;
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      dark += mask[rowOffset + x];
    }
    return dark / width;
  });

  const staff = findBestStaffLineGroup(rowRatios, settings);
  if (!staff) return null;

  const topLine = staff.lines[0].center;
  const bottomLine = staff.lines[4].center;
  const pad = Math.max(2, staff.averageGap * 0.45);
  const yStart = Math.max(0, Math.floor(topLine - pad));
  const yEnd = Math.min(height - 1, Math.ceil(bottomLine + pad));
  const staffHeight = Math.max(1, yEnd - yStart + 1);

  const columnRatios = Array.from({ length: width }, (_, x) => {
    let dark = 0;
    for (let y = yStart; y <= yEnd; y += 1) {
      dark += mask[(y * width) + x];
    }
    return dark / staffHeight;
  });

  const maxColumnRatio = Math.max(...columnRatios);
  const threshold = Math.max(settings.barlineHeightRatio, maxColumnRatio * settings.barlineThresholdRatio);
  const barlineRuns = mergeCloseBarlineRuns(
    collectRuns(columnRatios, threshold)
      .filter(run => isStaffAlignedBarline(run, staff, mask, width, height, settings)),
    width,
    settings,
  );

  if (barlineRuns.length < 2) return null;
  return Math.max(1, barlineRuns.length - 1);
}

export function detectMeasureCountFromImageElement(image, coordinate) {
  if (!image?.complete || !coordinate) return null;
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return null;

  const x = Math.max(0, Math.floor(coordinate.x * naturalWidth));
  const y = Math.max(0, Math.floor(coordinate.y * naturalHeight));
  const width = Math.max(1, Math.floor(coordinate.width * naturalWidth));
  const height = Math.max(1, Math.floor(coordinate.height * naturalHeight));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
    return detectMeasureCountFromImageData(ctx.getImageData(0, 0, width, height));
  } catch {
    return null;
  }
}
