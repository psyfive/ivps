// src/components/phases/DuringMiniControls.jsx
// ─────────────────────────────────────────────────────────────────────────────
// During Phase Fullscreen — 하단 고정 미니 컨트롤 바
//
// 전체화면 연습 중 악보에 집중하면서도 핵심 컨트롤에 접근 가능:
//   [← 이전 구간]  [♩BPM  –5  +5]  [🍇 완료/전체]  [⏱ 경과]  [다음 구간 →]  [◧ 패널]
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
  if (accent)  colors = 'bg-[rgba(212,168,67,.12)] border-[rgba(212,168,67,.3)] text-[#d4a843] hover:bg-[rgba(212,168,67,.2)]';
  else if (danger) colors = 'bg-[rgba(224,112,112,.1)] border-[rgba(224,112,112,.25)] text-[#e07070] hover:bg-[rgba(224,112,112,.18)]';
  else if (dim) colors = 'bg-transparent border-transparent text-[rgba(255,255,255,.25)] cursor-default';
  else         colors = 'bg-[rgba(255,255,255,.05)] border-[rgba(255,255,255,.1)] text-[rgba(255,255,255,.6)] hover:bg-[rgba(255,255,255,.1)] hover:text-white';

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

// ─────────────────────────────────────────────────────────────────────────────
export function DuringMiniControls({ onOpenPanel }) {
  const {
    bpm,
    grapeFilled,
    grapeTotal,
    activeScore,
    selectedSegmentId,
    metro,
    grape,
    score: scoreActs,
    segment: segmentActs,
  } = usePractice();

  const segments    = activeScore?.segments ?? [];
  const selIdx      = segments.findIndex(s => s.id === selectedSegmentId);
  const hasPrev     = selIdx > 0;
  const hasNext     = selIdx < segments.length - 1 && selIdx !== -1;
  const targetBpm   = segments[selIdx]?.targetBpm ?? null;
  const targetReps  = segments[selIdx]?.targetReps ?? null;

  // ── 경과 시간 ────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [selectedSegmentId]); // 구간 바뀌면 리셋

  // ── BPM 직접 입력 ─────────────────────────────────────────────────
  const [bpmInput, setBpmInput] = useState(String(bpm));
  useEffect(() => { setBpmInput(String(bpm)); }, [bpm]);

  const commitBpm = useCallback(() => {
    const v = Number(bpmInput);
    if (!isNaN(v) && v >= 20 && v <= 240) metro.setBpm(v);
    else setBpmInput(String(bpm));
  }, [bpmInput, bpm, metro]);

  // ── BPM 조정 ─────────────────────────────────────────────────────
  const incBpm = useCallback(() => metro.setBpm(Math.min(240, bpm + 5)), [metro, bpm]);
  const decBpm = useCallback(() => metro.setBpm(Math.max(20,  bpm - 5)), [metro, bpm]);

  // ── 구간 이동 (페이지 자동 점프 포함) ───────────────────────────────
  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    const target = segments[selIdx - 1];
    segmentActs.selectSegment(target.id);
    if (target.pageIndex != null && target.pageIndex !== activeScore?.currentPageIndex) {
      scoreActs.setPage(target.pageIndex);
    }
  }, [hasPrev, selIdx, segments, segmentActs, scoreActs, activeScore]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    const target = segments[selIdx + 1];
    segmentActs.selectSegment(target.id);
    if (target.pageIndex != null && target.pageIndex !== activeScore?.currentPageIndex) {
      scoreActs.setPage(target.pageIndex);
    }
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
      {/* ── 구간 이동 ← ── */}
      <MiniBtn onClick={goPrev} disabled={!hasPrev} title="이전 구간">
        ← {selIdx > 0 ? `${selIdx}구간` : '이전'}
      </MiniBtn>

      <Sep />

      {/* ── BPM 컨트롤 ── */}
      <div className="flex items-center gap-1">
        <MiniBtn onClick={decBpm} title="BPM -5">–5</MiniBtn>
        <div
          className="flex items-center gap-1.5 px-2 h-[34px] rounded-lg border font-mono text-[12px] font-bold"
          style={{
            background: 'rgba(212,168,67,.08)',
            borderColor: 'rgba(212,168,67,.25)',
            color: '#d4a843',
            minWidth: 68,
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 10, opacity: 0.7 }}>♩</span>
          <input
            type="number"
            min="20"
            max="240"
            value={bpmInput}
            onChange={e => setBpmInput(e.target.value)}
            onBlur={commitBpm}
            onKeyDown={e => { if (e.key === 'Enter') { commitBpm(); e.target.blur(); } }}
            onFocus={e => e.target.select()}
            className="font-mono font-bold text-[12px] bg-transparent border-none outline-none text-center"
            style={{ color: '#d4a843', width: 36, appearance: 'textfield', MozAppearance: 'textfield' }}
          />
          {targetBpm && bpm < targetBpm && (
            <span style={{ fontSize: 8, opacity: 0.5 }}>/{targetBpm}</span>
          )}
        </div>
        <MiniBtn onClick={incBpm} title="BPM +5" accent>+5</MiniBtn>
      </div>

      <Sep />

      {/* ── 포도 체크 ── */}
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

      {/* ── 경과 시간 ── */}
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

      {/* ── 스페이서 ── */}
      <div className="flex-1" />

      {/* ── 구간 이동 → ── */}
      <MiniBtn onClick={goNext} disabled={!hasNext} title="다음 구간" accent={hasNext}>
        {selIdx < segments.length - 1 ? `${selIdx + 2}구간` : '다음'} →
      </MiniBtn>

      <Sep />

      {/* ── 패널 열기 ── */}
      <MiniBtn onClick={onOpenPanel} title="패널 열기">
        <span className="mr-1 text-[13px] leading-none">◧</span>
        패널
      </MiniBtn>
    </div>
  );
}
