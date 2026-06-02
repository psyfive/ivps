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
  barlineMorphCoverageRatio: 0.88,
  barlineContextOffsetRatio: 0.28,
  barlineContextBandRatio: 0.5,
  barlineContextMaxDensity: 0.42,
  virtualLeftBoundaryStaffStartRatio: 2,
  virtualLeftBoundaryStaffRunRatio: 0.75,
  virtualLeftBoundaryBarlineDistanceRatio: 0.8,
  systemStartMarkerSearchRatio: 1.25,
  systemStartMarkerMinSpanRatio: 0.55,
  systemStartMarkerMinDarkRatio: 0.42,
  rightEdgeBarlineSearchRatio: 0.35,
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

function passesVerticalOpening(stroke, staffHeight, options) {
  const span = Math.max(1, stroke.end - stroke.start + 1);
  const minCoverage = staffHeight * options.barlineMorphCoverageRatio;
  return stroke.darkRows >= minCoverage && (stroke.darkRows / span) >= options.barlineMorphCoverageRatio;
}

function clampRange(start, end, limit) {
  const nextStart = Math.max(0, start);
  const nextEnd = Math.min(limit - 1, end);
  if (nextStart > nextEnd) return null;
  return { start: nextStart, end: nextEnd };
}

// 검색 범위(yStart/yEnd) 바깥으로 averageGap*0.75 이상 어두운 픽셀이 연장되면
// 오선을 크게 넘은 마크(음자리표·브래킷 등)로 판단해 거부.
// 1px 체크였던 이전 버전은 오선 경계 근처 음표 기둥/머리 때문에
// 정상 바라인도 거부하는 과도한 거름 현상이 있었다.
function hasExtendedBeyondStaff(mask, width, run, yStart, yEnd, height, averageGap) {
  const margin = Math.max(2, Math.round(averageGap * 0.75));
  const topCheckY = Math.max(0, yStart - margin);
  const bottomCheckY = Math.min(height - 1, yEnd + margin);
  return (
    hasDarkPixelInRun(mask, width, run, topCheckY) ||
    hasDarkPixelInRun(mask, width, run, bottomCheckY)
  );
}

function isNearStaffLine(y, staff, tolerance) {
  return staff.lines.some(line => Math.abs(y - line.center) <= tolerance);
}

function sampleDensity(mask, width, xRange, yRange, staff, staffLineTolerance) {
  let dark = 0;
  let total = 0;

  for (let y = yRange.start; y <= yRange.end; y += 1) {
    if (isNearStaffLine(y, staff, staffLineTolerance)) continue;

    for (let x = xRange.start; x <= xRange.end; x += 1) {
      total += 1;
      dark += mask[(y * width) + x];
    }
  }

  return total === 0 ? 0 : dark / total;
}

function buildEndpointContextBands(staff, height, options) {
  const gap = staff.averageGap;
  const bandHeight = Math.max(2, Math.round(gap * options.barlineContextBandRatio));
  const lineAvoid = Math.max(1, Math.round(gap * 0.18));
  const topLine = staff.lines[0].center;
  const bottomLine = staff.lines[4].center;
  const candidates = [
    [Math.floor(topLine + lineAvoid + 1), Math.floor(topLine + lineAvoid + bandHeight)],
    [Math.ceil(bottomLine - lineAvoid - bandHeight), Math.ceil(bottomLine - lineAvoid - 1)],
    [Math.ceil(topLine - lineAvoid - bandHeight), Math.ceil(topLine - lineAvoid - 1)],
    [Math.floor(bottomLine + lineAvoid + 1), Math.floor(bottomLine + lineAvoid + bandHeight)],
  ];

  return candidates
    .map(([start, end]) => clampRange(start, end, height))
    .filter(Boolean);
}

function hasDenseAttachedContext(run, staff, mask, width, height, options) {
  const gap = staff.averageGap;
  const offset = Math.max(1, Math.round(gap * options.barlineContextOffsetRatio));
  const sampleWidth = Math.max(2, Math.round(gap * 0.45));
  const staffLineTolerance = Math.max(1, Math.round(gap * 0.18));
  const bands = buildEndpointContextBands(staff, height, options);
  const xRanges = [
    clampRange(run.start - offset - sampleWidth, run.start - offset - 1, width),
    clampRange(run.end + offset + 1, run.end + offset + sampleWidth, width),
  ].filter(Boolean);

  for (const yRange of bands) {
    for (const xRange of xRanges) {
      const density = sampleDensity(mask, width, xRange, yRange, staff, staffLineTolerance);
      if (density > options.barlineContextMaxDensity) return true;
    }
  }

  return false;
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
  // yStart/yEnd는 이미 Math.floor/ceil로 정수화된 값이므로 float 비교 오류 없음.
  // topLine - endpointTolerance는 float이 되어 stroke.start(정수)와 비교 시
  // note 잉크로 stroke가 yStart에서 시작하는 경우 "yStart >= yStart+ε" 조건 실패 가능.
  const alignedToStaff = (
    stroke.start >= yStart &&
    stroke.start <= Math.ceil(topLine + endpointTolerance) &&
    stroke.end >= Math.floor(bottomLine - endpointTolerance) &&
    stroke.end <= yEnd &&
    stroke.darkRows >= minCoverage
  );

  return (
    alignedToStaff &&
    !hasExtendedBeyondStaff(mask, width, run, yStart, yEnd, height, staff.averageGap) &&
    passesVerticalOpening(stroke, staffHeight, options) &&
    !hasDenseAttachedContext(run, staff, mask, width, height, options)
  );
}

function getStaffBounds(staff) {
  const topLine = staff.lines[0].center;
  const bottomLine = staff.lines[4].center;
  const staffHeight = Math.max(1, bottomLine - topLine);
  return { topLine, bottomLine, staffHeight };
}

function hasStaffLineRun(mask, width, height, lineCenter, xStart, runLength, yTolerance) {
  const xRange = clampRange(xStart, xStart + runLength - 1, width);
  const yRange = clampRange(
    Math.floor(lineCenter - yTolerance),
    Math.ceil(lineCenter + yTolerance),
    height,
  );
  if (!xRange || !yRange) return false;

  let hasLineAtStart = false;
  for (let y = yRange.start; y <= yRange.end; y += 1) {
    if (mask[(y * width) + xRange.start]) {
      hasLineAtStart = true;
      break;
    }
  }
  if (!hasLineAtStart) return false;

  let dark = 0;
  let total = 0;
  for (let y = yRange.start; y <= yRange.end; y += 1) {
    for (let x = xRange.start; x <= xRange.end; x += 1) {
      total += 1;
      dark += mask[(y * width) + x];
    }
  }

  return total > 0 && dark / total >= 0.22;
}

function findStaffStartX(mask, width, height, staff, options) {
  const { staffHeight } = getStaffBounds(staff);
  const searchLimit = Math.min(
    width - 1,
    Math.round(staffHeight * options.virtualLeftBoundaryStaffStartRatio),
  );
  const runLength = Math.max(8, Math.round(staffHeight * options.virtualLeftBoundaryStaffRunRatio));
  const yTolerance = Math.max(1, Math.round(staff.averageGap * 0.18));

  for (let x = 0; x <= searchLimit; x += 1) {
    let staffLinesPresent = 0;
    for (const line of staff.lines) {
      if (hasStaffLineRun(mask, width, height, line.center, x, runLength, yTolerance)) {
        staffLinesPresent += 1;
      }
    }

    if (staffLinesPresent >= 4) return x;
  }

  return null;
}

function hasBarlineNearStaffStart(barlineRuns, staffStartX, staff, options) {
  const firstRun = barlineRuns[0];
  if (!firstRun) return false;
  const { staffHeight } = getStaffBounds(staff);

  const leftLimit = Math.max(staff.averageGap * 2, staffHeight * options.virtualLeftBoundaryBarlineDistanceRatio);
  return runCenter(firstRun) - staffStartX <= leftLimit;
}

function hasSystemStartMarker(mask, width, height, staff, staffStartX, options) {
  const { topLine, bottomLine, staffHeight } = getStaffBounds(staff);
  const xEnd = Math.min(
    width - 1,
    Math.ceil(staffStartX + (staffHeight * options.systemStartMarkerSearchRatio)),
  );
  const yStart = Math.max(0, Math.floor(topLine - (staff.averageGap * 0.8)));
  const yEnd = Math.min(height - 1, Math.ceil(bottomLine + (staff.averageGap * 0.8)));
  const maxGap = Math.max(1, Math.round(staff.averageGap * 0.5));
  const barlineEndpointTolerance = Math.max(2, Math.round(staff.averageGap * options.barlineEndpointToleranceRatio));
  const minSpan = staffHeight * options.systemStartMarkerMinSpanRatio;
  const minDarkRows = staffHeight * options.systemStartMarkerMinDarkRatio;

  for (let x = 0; x <= xEnd; x += 1) {
    const stroke = findVerticalStroke(mask, width, { start: x, end: x }, yStart, yEnd, maxGap);
    if (!stroke) continue;

    const span = stroke.end - stroke.start + 1;
    const overshootsStaff = (
      stroke.start < topLine - barlineEndpointTolerance ||
      stroke.end > bottomLine + barlineEndpointTolerance
    );
    if (overshootsStaff && span >= minSpan && stroke.darkRows >= minDarkRows) return true;
  }

  return false;
}

function isLikelySystemStart(staffStartX, staff, mask, width, height, options) {
  const { staffHeight } = getStaffBounds(staff);
  return (
    staffStartX <= staffHeight * options.virtualLeftBoundaryStaffStartRatio &&
    hasSystemStartMarker(mask, width, height, staff, staffStartX, options)
  );
}

function shouldUseVirtualLeftBoundary(barlineRuns, staff, mask, width, height, options) {
  const staffStartX = findStaffStartX(mask, width, height, staff, options);
  if (staffStartX === null) return false;

  if (isLikelySystemStart(staffStartX, staff, mask, width, height, options)) return true;
  return !hasBarlineNearStaffStart(barlineRuns, staffStartX, staff, options);
}

function isRightEdgeAlignedBarline(run, staff, mask, width, height, options) {
  const runWidth = run.end - run.start + 1;
  const maxRunWidth = Math.max(4, Math.round(staff.averageGap * options.barlineMaxWidthRatio));
  if (runWidth > maxRunWidth) return false;

  const { topLine, bottomLine, staffHeight } = getStaffBounds(staff);
  const endpointTolerance = Math.max(2, Math.round(staff.averageGap * options.barlineEndpointToleranceRatio));
  const maxGap = Math.max(0, Math.round(staff.averageGap * options.barlineMaxGapRatio));
  const yStart = Math.max(0, Math.floor(topLine - endpointTolerance));
  const yEnd = Math.min(height - 1, Math.ceil(bottomLine + endpointTolerance));
  const stroke = findVerticalStroke(mask, width, run, yStart, yEnd, maxGap);

  if (!stroke) return false;

  return (
    stroke.start >= topLine - endpointTolerance &&
    stroke.start <= topLine + endpointTolerance &&
    stroke.end >= bottomLine - endpointTolerance &&
    stroke.end <= bottomLine + endpointTolerance &&
    stroke.darkRows >= staffHeight * options.barlineCoverageRatio &&
    passesVerticalOpening(stroke, staffHeight, options)
  );
}

function findRightEdgeBarlineRun(mask, width, height, staff, options) {
  const { staffHeight } = getStaffBounds(staff);
  const searchWidth = Math.max(2, Math.round(staffHeight * options.rightEdgeBarlineSearchRatio));
  const xStart = Math.max(0, width - searchWidth);
  const runs = [];
  let start = -1;

  for (let x = xStart; x < width; x += 1) {
    const run = { start: x, end: x };
    if (isRightEdgeAlignedBarline(run, staff, mask, width, height, options)) {
      if (start === -1) start = x;
      continue;
    }

    if (start !== -1) {
      runs.push({ start, end: x - 1, strength: x - start });
      start = -1;
    }
  }

  if (start !== -1) runs.push({ start, end: width - 1, strength: width - start });
  return runs.find(run => isRightEdgeAlignedBarline(run, staff, mask, width, height, options)) ?? null;
}

// 이미지 안의 겹치지 않는 오선 그룹을 모두 수집한다.
// 찾은 오선의 y 범위(±averageGap*2)를 0으로 마스킹한 뒤 반복 탐색.
function findAllStaffLineGroups(rowRatios, options) {
  const groups = [];
  const working = rowRatios.slice();
  const MAX_GROUPS = 24;

  while (groups.length < MAX_GROUPS) {
    const group = findBestStaffLineGroup(working, options);
    if (!group) break;

    groups.push(group);

    const top = group.lines[0].center;
    const bottom = group.lines[4].center;
    const pad = group.averageGap * 2;
    const zeroStart = Math.max(0, Math.floor(top - pad));
    const zeroEnd = Math.min(working.length - 1, Math.ceil(bottom + pad));
    for (let i = zeroStart; i <= zeroEnd; i += 1) working[i] = 0;
  }

  groups.sort((a, b) => a.lines[0].center - b.lines[0].center);
  return groups;
}

// 단일 오선 그룹에 대해 마디 수를 계산한다.
function countMeasuresForStaff(staff, mask, width, height, options) {
  const topLine = staff.lines[0].center;
  const bottomLine = staff.lines[4].center;
  const pad = Math.max(2, staff.averageGap * 0.45);
  const yStart = Math.max(0, Math.floor(topLine - pad));
  const yEnd = Math.min(height - 1, Math.ceil(bottomLine + pad));
  const staffHeight = Math.max(1, yEnd - yStart + 1);

  const columnRatios = Array.from({ length: width }, (_, x) => {
    let dark = 0;
    for (let y = yStart; y <= yEnd; y += 1) dark += mask[(y * width) + x];
    return dark / staffHeight;
  });

  const maxColumnRatio = Math.max(...columnRatios);
  const threshold = Math.max(options.barlineHeightRatio, maxColumnRatio * options.barlineThresholdRatio);
  let barlineRuns = mergeCloseBarlineRuns(
    collectRuns(columnRatios, threshold)
      .filter(run => isStaffAlignedBarline(run, staff, mask, width, height, options)),
    width,
    options,
  );

  const rightEdgeRun = findRightEdgeBarlineRun(mask, width, height, staff, options);
  if (rightEdgeRun) {
    barlineRuns = mergeCloseBarlineRuns([...barlineRuns, rightEdgeRun], width, options);
  }

  const hasVirtualLeftBoundary = shouldUseVirtualLeftBoundary(barlineRuns, staff, mask, width, height, options);
  if (barlineRuns.length === 0 || (barlineRuns.length < 2 && !hasVirtualLeftBoundary)) return null;
  return Math.max(1, barlineRuns.length - (hasVirtualLeftBoundary ? 0 : 1));
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
    for (let x = 0; x < width; x += 1) dark += mask[rowOffset + x];
    return dark / width;
  });

  const staffGroups = findAllStaffLineGroups(rowRatios, settings);
  if (staffGroups.length === 0) return null;

  let total = 0;
  for (const staff of staffGroups) {
    const count = countMeasuresForStaff(staff, mask, width, height, settings);
    if (count !== null) total += count;
  }

  return total > 0 ? total : null;
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
