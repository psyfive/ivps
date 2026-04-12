// src/components/score/SegmentHeatmap.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 악보 위 구간별 연습 이력 히트맵 오버레이
//
// - Before/After 단계에서 각 구간 박스 위에 반투명 컬러 레이어 표시
// - 성공률이 높은 구간 → 초록, 어려움이 많은 구간 → 빨강, 균등 → 골드
// - 연습 횟수에 따라 색상 강도 증가 (최대 5회 기준)
// - 마지막 연습일 표시 (N일 전)
// ─────────────────────────────────────────────────────────────────────────────

const CAT_COLORS = {
  A: '#7ea890',
  B: '#d4a843',
  C: '#9b7fc8',
  D: '#6b90b8',
};

// ── 구간 XP 통계 계산 ─────────────────────────────────────────────────────
function computeSegmentStats(xpLog, segmentId) {
  const entries = xpLog.filter(e => e.segmentId === segmentId);
  if (entries.length === 0) return null;

  const total        = entries.length;
  const successCount = entries.filter(e => e.result === 'success').length;
  const hardCount    = entries.filter(e => e.result === 'hard').length;
  const lastTs       = Math.max(...entries.map(e => e.timestamp));

  return {
    total,
    successRate: successCount / total,
    hardRate:    hardCount    / total,
    lastTs,
  };
}

// ── 히트맵 색상 결정 ─────────────────────────────────────────────────────
function heatColor(stats) {
  if (!stats) return null;
  const { successRate, hardRate, total } = stats;
  // 5회 연습을 기준으로 강도 0→1 정규화
  const strength = Math.min(total / 5, 1);

  if (hardRate > 0.5) {
    const a = (0.07 + strength * 0.13).toFixed(2);
    return { bg: `rgba(224,112,112,${a})`, border: 'rgba(224,112,112,0.45)', label: '#e07070' };
  }
  if (successRate > 0.6) {
    const a = (0.07 + strength * 0.13).toFixed(2);
    return { bg: `rgba(126,168,144,${a})`, border: 'rgba(126,168,144,0.45)', label: '#7ea890' };
  }
  const a = (0.06 + strength * 0.10).toFixed(2);
  return { bg: `rgba(212,168,67,${a})`, border: 'rgba(212,168,67,0.35)', label: '#d4a843' };
}

// ── 경과 일수 라벨 ──────────────────────────────────────────────────────
function daysAgoLabel(ts) {
  const diff = Math.floor((Date.now() - ts) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${diff}일 전`;
}

// ── 결과 아이콘 ──────────────────────────────────────────────────────────
function resultIcon(stats) {
  if (!stats) return null;
  if (stats.hardRate    > 0.5) return '😣';
  if (stats.successRate > 0.6) return '🎯';
  return '😐';
}

// ─────────────────────────────────────────────────────────────────────────────
export function SegmentHeatmap({ segments, xpLog, selectedSegmentId, currentPageIndex }) {
  if (!segments || segments.length === 0) return null;

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 4, pointerEvents: 'none' }}
    >
      {segments.map((seg, globalIdx) => {
        const stats  = computeSegmentStats(xpLog, seg.id);
        const colors = heatColor(stats);

        // 현재 페이지의 좌표만
        const pageCoords = (seg.coordinates ?? []).filter(c => c.pageIndex === currentPageIndex);
        if (pageCoords.length === 0) return null;

        const isSelected = seg.id === selectedSegmentId;

        return pageCoords.map((coord, ci) => {
          const left   = `${coord.x      * 100}%`;
          const top    = `${coord.y      * 100}%`;
          const width  = `${coord.width  * 100}%`;
          const height = `${coord.height * 100}%`;

          return (
            <div
              key={`${seg.id}-${ci}`}
              style={{
                position: 'absolute',
                left, top, width, height,
                pointerEvents: 'none',
                overflow: 'hidden',
                borderRadius: '2px',
              }}
            >
              {/* 히트맵 배경 색상 */}
              {colors && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '2px',
                  }}
                />
              )}

              {/* 통계 배지 — 첫 번째 좌표에만, 선택 구간에서는 더 강조 */}
              {ci === 0 && stats && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(13,17,23,0.72)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 9,
                    fontFamily: 'ui-monospace, monospace',
                    color: colors?.label ?? '#888',
                    whiteSpace: 'nowrap',
                    opacity: isSelected ? 1 : 0.8,
                  }}
                >
                  <span>{resultIcon(stats)}</span>
                  <span style={{ fontWeight: 600 }}>{stats.total}회</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 7 }}>·</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {daysAgoLabel(stats.lastTs)}
                  </span>
                </div>
              )}

              {/* 미연습 구간 — 점선 힌트 (선택 구간에서만 표시) */}
              {!stats && isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: 4,
                    background: 'rgba(13,17,23,0.6)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 9,
                    fontFamily: 'ui-monospace, monospace',
                    color: 'rgba(255,255,255,0.3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  미연습
                </div>
              )}
            </div>
          );
        });
      })}
    </div>
  );
}
