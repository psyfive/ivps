// src/components/dashboard/PracticeHeatmap.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 대시보드 — 7일 연습 활동 히트맵
//
// - 최근 7일의 일별 XP 바 차트
// - 색상: 가장 많이 연습한 카테고리(A/B/C/D) 색상으로 표시
// - 연습 없는 날: 회색 점선 표시
// - 오늘 / 어제 라벨 강조
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';

const CAT_COLORS = {
  A: '#7ea890',
  B: '#d4a843',
  C: '#9b7fc8',
  D: '#6b90b8',
};

const CAT_NAMES = {
  A: '왼손',
  B: '오른손',
  C: '음악성',
  D: '장비',
};

const RESULT_XP = { success: 30, ok: 15, hard: 5 };

// ── 7일 데이터 계산 ──────────────────────────────────────────────────────
function buildDayData(xpLog) {
  const now = Date.now();

  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now - (6 - i) * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime());
    dayEnd.setHours(23, 59, 59, 999);

    const entries = xpLog.filter(
      e => e.timestamp >= dayStart.getTime() && e.timestamp <= dayEnd.getTime()
    );

    const totalXp = entries.reduce((s, e) => s + e.xp, 0);

    // 카테고리별 XP 집계
    const catXp = { A: 0, B: 0, C: 0, D: 0 };
    entries.forEach(e => {
      const cat = e.skillId?.[0];
      if (cat && catXp[cat] !== undefined) catXp[cat] += e.xp;
    });

    // 최다 카테고리
    const topCat = Object.entries(catXp)
      .filter(([, xp]) => xp > 0)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    // 활성 카테고리 목록
    const activeCats = Object.entries(catXp)
      .filter(([, xp]) => xp > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([cat]) => cat);

    const weekDay = ['일', '월', '화', '수', '목', '금', '토'][dayStart.getDay()];
    const label   = i === 6 ? '오늘' : i === 5 ? '어제' : weekDay;
    const isToday = i === 6;

    return { label, isToday, totalXp, topCat, activeCats, catXp, entries };
  });
}

// ── 요약 통계 ─────────────────────────────────────────────────────────────
function buildSummary(days) {
  const weekXp       = days.reduce((s, d) => s + d.totalXp, 0);
  const activeDays   = days.filter(d => d.totalXp > 0).length;
  const maxXp        = Math.max(...days.map(d => d.totalXp), 1);

  // 가장 많이 연습한 카테고리
  const catTotals = { A: 0, B: 0, C: 0, D: 0 };
  days.forEach(d => {
    Object.entries(d.catXp).forEach(([cat, xp]) => { catTotals[cat] += xp; });
  });
  const focusCat = Object.entries(catTotals)
    .filter(([, xp]) => xp > 0)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  return { weekXp, activeDays, maxXp, focusCat };
}

// ── 하루 컬럼 ─────────────────────────────────────────────────────────────
function DayColumn({ day, maxXp }) {
  const barPct    = maxXp > 0 ? (day.totalXp / maxXp) * 100 : 0;
  const barColor  = day.topCat ? CAT_COLORS[day.topCat] : 'transparent';
  const isEmpty   = day.totalXp === 0;

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
      {/* XP 숫자 */}
      <div
        style={{
          fontSize: 9,
          fontFamily: 'ui-monospace, monospace',
          color: isEmpty ? 'rgba(255,255,255,0.15)' : (day.topCat ? CAT_COLORS[day.topCat] : '#888'),
          fontWeight: 600,
          height: 14,
          lineHeight: '14px',
        }}
      >
        {isEmpty ? '' : `${day.totalXp}`}
      </div>

      {/* 바 영역 */}
      <div
        style={{
          width: '100%',
          height: 60,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {isEmpty ? (
          // 연습 없는 날 — 점선 기둥
          <div
            style={{
              width: '60%',
              height: '100%',
              borderLeft: '1px dashed rgba(255,255,255,0.07)',
              borderRight: '1px dashed rgba(255,255,255,0.07)',
            }}
          />
        ) : (
          <div
            style={{
              width: '72%',
              height: `${Math.max(barPct, 8)}%`,
              background: `linear-gradient(180deg, ${barColor}99 0%, ${barColor} 100%)`,
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.4s ease',
              boxShadow: `0 0 8px ${barColor}40`,
            }}
          />
        )}
      </div>

      {/* 카테고리 점들 */}
      <div style={{ height: 8, display: 'flex', gap: 2, alignItems: 'center' }}>
        {day.activeCats.slice(0, 3).map(cat => (
          <div
            key={cat}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: CAT_COLORS[cat],
              opacity: 0.8,
            }}
          />
        ))}
      </div>

      {/* 요일 라벨 */}
      <div
        style={{
          fontSize: day.isToday ? 10 : 9,
          fontFamily: 'ui-monospace, monospace',
          fontWeight: day.isToday ? 700 : 400,
          color: day.isToday
            ? '#d4a843'
            : isEmpty
            ? 'rgba(255,255,255,0.2)'
            : 'rgba(255,255,255,0.45)',
        }}
      >
        {day.label}
      </div>
    </div>
  );
}

// ── 카테고리 범례 ─────────────────────────────────────────────────────────
function CatLegend({ catXp }) {
  const active = Object.entries(catXp)
    .filter(([, xp]) => xp > 0)
    .sort(([, a], [, b]) => b - a);

  if (active.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
      {active.map(([cat, xp]) => (
        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: CAT_COLORS[cat],
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 9.5,
              fontFamily: 'ui-monospace, monospace',
              color: CAT_COLORS[cat],
            }}
          >
            {cat} {CAT_NAMES[cat]}
          </span>
          <span
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {xp}xp
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────
export function PracticeHeatmap({ xpLog }) {
  const days    = useMemo(() => buildDayData(xpLog), [xpLog]);
  const summary = useMemo(() => buildSummary(days),  [days]);

  // 이번 주 카테고리별 XP 합산
  const weekCatXp = useMemo(() => {
    const totals = { A: 0, B: 0, C: 0, D: 0 };
    days.forEach(d => {
      Object.entries(d.catXp).forEach(([cat, xp]) => { totals[cat] += xp; });
    });
    return totals;
  }, [days]);

  if (xpLog.length === 0) {
    return (
      <div
        style={{
          padding: '20px 0',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.2)',
          fontSize: 12,
        }}
      >
        연습을 시작하면 활동 기록이 쌓입니다.
      </div>
    );
  }

  return (
    <div>
      {/* 요약 줄 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <span style={{ color: '#d4a843', fontWeight: 700 }}>
          {summary.weekXp} XP
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {summary.activeDays}일 연습
        </span>
        {summary.focusCat && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ color: CAT_COLORS[summary.focusCat] }}>
              {CAT_NAMES[summary.focusCat]} 집중
            </span>
          </>
        )}
      </div>

      {/* 바 차트 */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 100 }}>
        {days.map((day, i) => (
          <DayColumn key={i} day={day} maxXp={summary.maxXp} />
        ))}
      </div>

      {/* 카테고리 범례 */}
      <CatLegend catXp={weekCatXp} />
    </div>
  );
}
