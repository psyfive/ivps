// src/components/phases/DuringMiniControls.jsx
// ─────────────────────────────────────────────────────────────────────────────
// During Phase Fullscreen — 하단 고정 미니 컨트롤 바
//
//   [↩ Before]  |  [← 이전구간]  [♩BPM]  [🍇]  [⏱]  [다음구간 →]  |  [⏹ 연습종료]
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';

// ── 경과 시간 포맷 ─────────────────────────────────────────────────────────
function fmtElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── 미니 버튼 공통 스타일 ──────────────────────────────────────────────────
function MiniBtn({ onClick, children, title, accent, dim, danger, disabled }) {
  const base = 'flex items-center justify-center rounded-lg border text-[11.5px] font-semibold transition-all select-none';
  let colors;
  if (accent)       colors = 'bg-[rgba(212,168,67,.12)] border-[rgba(212,168,67,.3)] text-[#d4a843] hover:bg-[rgba(212,168,67,.2)]';
  else if (danger)  colors = 'bg-[rgba(224,112,112,.1)] border-[rgba(224,112,112,.25)] text-[#e07070] hover:bg-[rgba(224,112,112,.18)]';
  else if (dim)     colors = 'bg-transparent border-transparent text-[rgba(255,255,255,.25)] cursor-default';
  else              colors = 'bg-[rgba(255,255,255,.05)] border-[rgba(255,255,255,.1)] text-[rgba(255,255,255,.6)] hover:bg-[rgba(255,255,255,.1)] hover:text-white';

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${base} ${colors} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      style={{ height: 34, paddingLeft: 10, paddingRight: 10 }}
    >
      {children}
    </button>
  );
}

// ── 구분선 ────────────────────────────────────────────────────────────────
function Sep() {
  return <div className="w-px h-4 bg-[rgba(255,255,255,.08)] flex-shrink-0" />;
}

// ── 구간의 가장 빠른 페이지 인덱스 ────────────────────────────────────────
function getSegmentMinPage(seg) {
  if (!seg) return 0;
  const pages = (seg.coordinates ?? []).map(c => c.pageIndex).filter(p => p != null);
  return pages.length > 0 ? Math.min(...pages) : (seg.pageIndex ?? 0);
}

// ─────────────────────────────────────────────────────────────────────────────
export function DuringMiniControls() {
  const {
    bpm,
    grapeFilled,
    grapeTotal,
    activeScore,
    selectedSegmentId,
    metro,
    grape,
    nav,
    score: scoreActs,
    segment: segmentActs,
  } = usePractice();

  const segments   = activeScore?.segments ?? [];
  const selIdx     = segments.findIndex(s => s.id === selectedSegmentId);
  const hasPrev    = selIdx > 0;
  const hasNext    = selIdx < segments.length - 1 && selIdx !== -1;
  const targetBpm  = segments[selIdx]?.targetBpm ?? null;
  const targetReps = segments[selIdx]?.targetReps ?? null;

  // ── 경과 시간 ────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [selectedSegmentId]);

  // ── 확장 메트로놈 패널 토글 ──────────────────────────────────────
  const [metroOpen, setMetroOpen] = useState(false);
  const metroPanelRef = useRef(null);
  const metroBtnRef   = useRef(null);

  useEffect(() => {
    if (!metroOpen) return;
    const onDown = (e) => {
      if (
        metroPanelRef.current && !metroPanelRef.current.contains(e.target) &&
        metroBtnRef.current   && !metroBtnRef.current.contains(e.target)
      ) {
        setMetroOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [metroOpen]);

  // ── 구간 이동 (페이지 자동 점프 포함) ───────────────────────────────
  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    const target = segments[selIdx - 1];
    segmentActs.selectSegment(target.id);
    const targetPage = getSegmentMinPage(target);
    if (targetPage !== activeScore?.currentPageIndex) scoreActs.setPage(targetPage);
  }, [hasPrev, selIdx, segments, segmentActs, scoreActs, activeScore]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    const target = segments[selIdx + 1];
    segmentActs.selectSegment(target.id);
    const targetPage = getSegmentMinPage(target);
    if (targetPage !== activeScore?.currentPageIndex) scoreActs.setPage(targetPage);
  }, [hasNext, selIdx, segments, segmentActs, scoreActs, activeScore]);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex items-center gap-2 px-4"
      style={{
        height: 52,
        background: 'linear-gradient(180deg, rgba(13,17,23,0) 0%, rgba(13,17,23,0.92) 40%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ── 좌: Before로 돌아가기 ── */}
      <MiniBtn onClick={() => nav.setPhase('before')} title="Before 단계로">
        ↩ Before
      </MiniBtn>

      <Sep />

      {/* ── 중앙: 구간 이동 + BPM + 포도 + 경과 ── */}
      <div className="flex flex-1 items-center justify-center gap-2">

        {/* 이전 구간 */}
        <MiniBtn onClick={goPrev} disabled={!hasPrev} title="이전 구간">
          ← {selIdx > 0 ? `${selIdx}구간` : '이전'}
        </MiniBtn>

        <Sep />

        {/* BPM 버튼 + 확장 패널 */}
        <div className="relative">
          <button
            ref={metroBtnRef}
            onClick={() => setMetroOpen(o => !o)}
            title="메트로놈 설정"
            className="flex items-center gap-1.5 px-3 h-[34px] rounded-lg border font-mono text-[12px] font-bold transition-all"
            style={{
              background: metroOpen ? 'rgba(212,168,67,.18)' : 'rgba(212,168,67,.08)',
              borderColor: metroOpen ? 'rgba(212,168,67,.55)' : 'rgba(212,168,67,.25)',
              color: '#d4a843',
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.7 }}>♩</span>
            {bpm}
            {targetBpm && bpm < targetBpm && (
              <span style={{ fontSize: 8, opacity: 0.5 }}>/{targetBpm}</span>
            )}
          </button>

          {/* 확장 메트로놈 패널 */}
          {metroOpen && (
            <div
              ref={metroPanelRef}
              className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50"
              style={{
                background: 'rgba(18,22,30,0.97)',
                border: '1px solid rgba(212,168,67,.3)',
                borderRadius: 12,
                boxShadow: '0 -4px 24px rgba(0,0,0,0.35)',
                minWidth: 200,
                padding: '14px 16px',
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-[rgba(212,168,67,.6)] mb-3">
                메트로놈
              </div>
              {/* 패널 내용 — 추후 요구사항에 따라 추가 */}
              <div className="text-[11px] text-[rgba(255,255,255,.35)] text-center py-2">
                설정 항목이 곧 추가됩니다
              </div>
            </div>
          )}
        </div>

        <Sep />

        {/* 포도 체크 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { if (grapeFilled < grapeTotal) grape.toggleGrape(grapeFilled); }}
            disabled={grapeFilled >= grapeTotal}
            title={grapeFilled < grapeTotal ? `포도 +1 (${grapeFilled + 1}/${grapeTotal})` : '모두 완료'}
            className="flex items-center gap-1 px-2.5 h-[34px] rounded-lg border font-mono text-[11px] transition-colors"
            style={{
              background: 'rgba(155,127,200,.07)',
              borderColor: 'rgba(155,127,200,.2)',
              color: '#9b7fc8',
              cursor: grapeFilled < grapeTotal ? 'pointer' : 'default',
            }}
            onMouseEnter={e => { if (grapeFilled < grapeTotal) e.currentTarget.style.background = 'rgba(155,127,200,.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(155,127,200,.07)'; }}
          >
            <span style={{ fontSize: 12 }}>🍇</span>
            <span className="font-bold">{grapeFilled}</span>
            <span style={{ opacity: 0.45 }}>/{grapeTotal}</span>
            {targetReps && (
              <span style={{ opacity: 0.4, fontSize: 9 }}> (목표 {targetReps})</span>
            )}
          </button>
          <MiniBtn onClick={grape.resetGrapes} title="포도 초기화">↺</MiniBtn>
        </div>

        <Sep />

        {/* 경과 시간 */}
        <div
          className="font-mono text-[11.5px] px-2.5 h-[34px] flex items-center rounded-lg border"
          style={{
            background: 'rgba(255,255,255,.03)',
            borderColor: 'rgba(255,255,255,.07)',
            color: 'rgba(255,255,255,.45)',
            minWidth: 56,
            justifyContent: 'center',
          }}
        >
          ⏱ {fmtElapsed(elapsed)}
        </div>

        <Sep />

        {/* 다음 구간 */}
        <MiniBtn onClick={goNext} disabled={!hasNext} title="다음 구간" accent={hasNext}>
          {selIdx < segments.length - 1 ? `${selIdx + 2}구간` : '다음'} →
        </MiniBtn>

      </div>

      <Sep />

      {/* ── 우: 연습 종료 ── */}
      <MiniBtn onClick={nav.enterLastAfter} title="연습 종료" danger>
        ⏹ 종료
      </MiniBtn>
    </div>
  );
}
