// src/components/dashboard/PracticeHeatmap.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 100일 연습 활동 히트맵 — 10×10 정사각형 그리드
//
// 색상 강도 기준:
//   Primary  — during phase 연습시간 (durationMinutes per day)
//   Fallback — XP (durationMinutes=0인 날의 보조 지표)
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';

const GAP  = 4;
const COLS = 10;
const ROWS = 10;
const DAYS = COLS * ROWS; // 100

const DUR_LEVELS = [
  { min: 60, op: 0.95 },
  { min: 45, op: 0.80 },
  { min: 30, op: 0.62 },
  { min: 15, op: 0.42 },
  { min:  1, op: 0.24 },
];

function cellColor(durationMinutes, xpFallback, hasQuality) {
  const idx = DUR_LEVELS.findIndex(l => durationMinutes >= l.min);
  if (idx !== -1) {
    const bumped = hasQuality ? Math.max(0, idx - 1) : idx;
    return `rgba(160,120,20,${DUR_LEVELS[bumped].op})`;
  }
  if (xpFallback >= 60) return 'rgba(160,120,20,0.36)';
  if (xpFallback >= 30) return 'rgba(160,120,20,0.22)';
  if (xpFallback >= 1)  return 'rgba(160,120,20,0.13)';
  return 'rgba(160,120,20,0.06)';
}

function buildCells(practiceSessions, xpLog) {
  const now = Date.now();

  return Array.from({ length: DAYS }, (_, idx) => {
    const dayOffset = (DAYS - 1) - idx; // 0=오늘, 99=99일전
    const dayStart  = new Date(now - dayOffset * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const daySessions = practiceSessions.filter(
      s => s.date >= dayStart.getTime() && s.date <= dayEnd.getTime()
    );
    const durationMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
    const hasQualityBonus = daySessions.some(s => s.hasQualityBonus);

    const xpTotal = xpLog
      .filter(e => e.timestamp >= dayStart.getTime() && e.timestamp <= dayEnd.getTime())
      .reduce((sum, e) => sum + e.xp, 0);

    const isToday = dayOffset === 0;
    const label   = `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;

    return { idx, durationMinutes, xpTotal, hasQualityBonus, isToday, label };
  });
}

function buildWeekSummary(practiceSessions, xpLog) {
  const now = Date.now();
  const weekStart = new Date(now - 6 * 86400000);
  weekStart.setHours(0, 0, 0, 0);

  const weekMinutes = practiceSessions
    .filter(s => s.date >= weekStart.getTime())
    .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

  const weekXp = xpLog
    .filter(e => e.timestamp >= weekStart.getTime())
    .reduce((sum, e) => sum + e.xp, 0);

  return { weekMinutes, weekXp };
}

export function PracticeHeatmap({ practiceSessions = [], xpLog = [] }) {
  const cells = useMemo(() => buildCells(practiceSessions, xpLog), [practiceSessions, xpLog]);
  const { weekMinutes, weekXp } = useMemo(
    () => buildWeekSummary(practiceSessions, xpLog),
    [practiceSessions, xpLog],
  );

  return (
    <div>
      {/* 이번 주 요약 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <span style={{ color: 'var(--ivps-gold)', fontWeight: 700 }}>
          {weekMinutes}분
        </span>
        <span style={{ color: 'var(--ivps-text4)' }}>·</span>
        <span style={{ color: 'var(--ivps-text3)' }}>이번 주</span>
        {weekXp > 0 && (
          <>
            <span style={{ color: 'var(--ivps-text4)' }}>·</span>
            <span style={{ color: 'var(--ivps-text3)' }}>{weekXp} XP</span>
          </>
        )}
      </div>

      {/* 10×10 그리드 — 패널 너비에 맞게 자동 확장 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows:    `repeat(${ROWS}, 1fr)`,
          gap: GAP,
          width:       '100%',
          aspectRatio: '1 / 1',
        }}
      >
        {cells.map(cell => (
          <div
            key={cell.idx}
            title={
              cell.durationMinutes > 0
                ? `${cell.label} — ${cell.durationMinutes}분 연습`
                : cell.xpTotal > 0
                ? `${cell.label} — ${cell.xpTotal} XP`
                : `${cell.label} — 연습 없음`
            }
            style={{
              aspectRatio:  '1 / 1',
              borderRadius: 4,
              background:   cellColor(cell.durationMinutes, cell.xpTotal, cell.hasQualityBonus),
              outline:      cell.isToday ? '2px solid var(--ivps-gold)' : 'none',
              outlineOffset: -1,
              cursor:       'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
        ))}
      </div>

      {/* 색상 범례 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 8,
          fontSize: 9,
          fontFamily: 'ui-monospace, monospace',
          color: 'var(--ivps-text4)',
        }}
      >
        <span>없음</span>
        {[0.06, 0.24, 0.42, 0.62, 0.95].map((op, i) => (
          <div
            key={i}
            style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(160,120,20,${op})` }}
          />
        ))}
        <span>60분+</span>
      </div>
    </div>
  );
}
