// src/components/phases/DuringMiniControls.jsx
// ─────────────────────────────────────────────────────────────────────────────
// During Phase Fullscreen — 하단 고정 미니 컨트롤 바
//
//   [↩ Before]  |  [← 이전구간]  [♩BPM]  [🍇]  [⏱]  [다음구간 →]  |  [⏹ 연습종료]
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { useMetronome } from '../../hooks/useMetronome';

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

// ── Ghost Train HUD 콘텐츠 ────────────────────────────────────────────────
// showBeats=true 이면 박자 도트를 함께 표시 (countIn/break 전용)
function ghostHudContent(ghostPhase) {
  if (!ghostPhase) return null;
  switch (ghostPhase) {
    case 'countIn': return { text: '♩  COUNT IN', color: '#d4a843', showBeats: true };
    case 'break':   return { text: 'READY', color: 'rgba(255,255,255,.5)', showBeats: true, pulse: true };
    case 'normal':  return { text: 'NORMAL CLOCK TEST',   color: '#10B981' };
    case 'ghost':   return { text: 'INTERNAL CLOCK TEST', color: '#9b7fc8' };
    default:        return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function DuringMiniControls() {
  const {
    bpm,
    beatsPerBar,
    metroPlaying,
    grapeFilled,
    grapeTotal,
    activeScore,
    selectedSegmentId,
    subdivision,
    ghostTrainBars,
    ghostTrainReadyBars,
    currentBeat,
    metro,
    grape,
    nav,
    score: scoreActs,
    segment: segmentActs,
  } = usePractice();

  const segments   = activeScore?.segments ?? [];
  const selIdx     = segments.findIndex(s => s.id === selectedSegmentId);
  const selSegment = selIdx >= 0 ? segments[selIdx] : null;
  const hasPrev    = selIdx > 0;
  const hasNext    = selIdx < segments.length - 1 && selIdx !== -1;
  const targetReps = selSegment?.targetReps ?? null;
  const effectiveBpm = selSegment?.targetBpm ?? bpm;

  // ── Ghost Train 로컬 상태 ────────────────────────────────────────
  const [ghostActive,     setGhostActive]    = useState(false);
  const [ghostPhase,      setGhostPhase]     = useState('');
  const [ghostBarInfo,    setGhostBarInfo]   = useState({ barInPhase: 0, totalBars: 0 });
  const [panelGhostBars,  setPanelGhostBars] = useState(ghostTrainBars);
  const [panelReadyBars,  setPanelReadyBars] = useState(ghostTrainReadyBars);
  const [showGhostInfo,   setShowGhostInfo]  = useState(false);

  // 메트로놈 OFF 시 Ghost Train 자동 종료
  useEffect(() => {
    if (!metroPlaying && ghostActive) {
      setGhostActive(false);
      setGhostPhase('');
    }
  }, [metroPlaying, ghostActive]);

  const onGhostPhaseChange = useCallback((phase) => {
    setGhostPhase(phase);
  }, []);

  const onGhostBarChange = useCallback((phase, barInPhase, totalBars) => {
    setGhostBarInfo({ barInPhase, totalBars });
  }, []);

  // 전체화면 During phase 전용 메트로놈 엔진
  useMetronome({
    bpm: effectiveBpm,
    beatsPerBar,
    subdivision,
    playing: metroPlaying,
    onBeat: useCallback(beat => metro.setCurrentBeat(beat), [metro]),
    ghostTrain: {
      enabled:       ghostActive,
      bars:          ghostTrainBars,
      readyBars:     ghostTrainReadyBars,
      onPhaseChange: onGhostPhaseChange,
      onBarChange:   onGhostBarChange,
    },
  });

  // ── 경과 시간 ────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [selectedSegmentId]);

  // ── 확장 메트로놈 패널 토글 ──────────────────────────────────────
  const [metroOpen, setMetroOpen]       = useState(false);
  const [panelBpm, setPanelBpm]         = useState(effectiveBpm);
  const [panelBeats, setPanelBeats]     = useState(beatsPerBar);
  const [panelSubdiv, setPanelSubdiv]   = useState(subdivision);
  const [bpmEditing, setBpmEditing]     = useState(false);
  const [beatsEditing, setBeatsEditing] = useState(false);
  const metroPanelRef = useRef(null);
  const metroBtnRef   = useRef(null);

  // 패널 열릴 때마다 현재 값으로 초기화
  useEffect(() => {
    if (metroOpen) {
      setPanelBpm(effectiveBpm);
      setPanelBeats(beatsPerBar);
      setPanelSubdiv(subdivision);
      setPanelGhostBars(ghostTrainBars);
      setPanelReadyBars(ghostTrainReadyBars);
      setBpmEditing(false);
      setBeatsEditing(false);
    }
  }, [metroOpen, effectiveBpm, beatsPerBar, subdivision, ghostTrainBars, ghostTrainReadyBars]);

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

  // ── 확인 핸들러 ─────────────────────────────────────────────────
  const confirmMetro = useCallback(() => {
    const v = Math.max(20, Math.min(240, panelBpm));
    if (selectedSegmentId) {
      segmentActs.setSegmentMeta(selectedSegmentId, { targetBpm: v });
    } else {
      metro.setBpm(v);
    }
    metro.setBeatsPerBar(Math.max(1, Math.min(16, panelBeats)));
    metro.setSubdivision(panelSubdiv);
    metro.setGhostTrainBars(Math.max(1, Math.min(32, panelGhostBars)));
    metro.setGhostTrainReadyBars(Math.max(1, Math.min(8, panelReadyBars)));
    setMetroOpen(false);
  }, [panelBpm, panelBeats, panelSubdiv, panelGhostBars, panelReadyBars,
      selectedSegmentId, segmentActs, metro]);

  // ── Ghost Train 시작 ─────────────────────────────────────────────
  const startGhostTrain = useCallback(() => {
    if (!metroPlaying) return;
    metro.setGhostTrainBars(Math.max(1, Math.min(32, panelGhostBars)));
    metro.setGhostTrainReadyBars(Math.max(1, Math.min(8, panelReadyBars)));
    setGhostPhase('countIn');
    setGhostActive(true);
    setMetroOpen(false);
  }, [metroPlaying, panelGhostBars, panelReadyBars, metro]);

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

  // ── Ghost Train HUD ──────────────────────────────────────────────
  const hudContent = ghostHudContent(ghostPhase);

  return (
    <>
      {/* Ghost Train 상태 HUD — 미니바 위에 표시 */}
      {ghostActive && hudContent && (
        <div
          className="absolute left-0 right-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ bottom: 52, height: 32 }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-1.5 rounded-full"
            style={{
              background: 'rgba(13,17,23,0.82)',
              border: `1px solid ${hudContent.color}40`,
              backdropFilter: 'blur(6px)',
            }}
          >
            {/* 라벨 텍스트 */}
            <span
              className={`text-[11px] font-bold tracking-widest ${hudContent.pulse ? 'animate-pulse' : ''}`}
              style={{ color: hudContent.color }}
            >
              {hudContent.text}
            </span>

            {/* 박자 도트 — countIn / break 에서만 표시 */}
            {hudContent.showBeats && (
              <div className="flex items-center gap-1">
                {Array.from({ length: beatsPerBar }, (_, i) => {
                  const isActive = currentBeat === i;
                  return (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-75"
                      style={{
                        width:  isActive ? 8 : 5,
                        height: isActive ? 8 : 5,
                        background: isActive ? hudContent.color : `${hudContent.color}40`,
                        boxShadow: isActive ? `0 0 6px ${hudContent.color}` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* 마디 카운터 */}
            {ghostBarInfo.totalBars > 0 && (
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: `${hudContent.color}bb` }}
              >
                {ghostBarInfo.barInPhase}/{ghostBarInfo.totalBars}마디
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 미니바 ── */}
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
              {effectiveBpm}
              {selSegment?.targetBpm && (
                <span style={{ fontSize: 8, opacity: 0.5, color: '#10B981' }}>✦</span>
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
                  width: 260,
                  padding: '14px 16px',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                }}
              >
                {/* ── 헤더 ── */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[rgba(212,168,67,.6)]">
                      메트로놈
                    </span>
                    <button
                      onClick={() => metro.setMetroPlaying(!metroPlaying)}
                      className="flex items-center gap-1 px-2 h-5 rounded-full border text-[9.5px] font-bold transition-all"
                      style={{
                        background: metroPlaying ? 'rgba(16,185,129,.18)' : 'rgba(255,255,255,.06)',
                        borderColor: metroPlaying ? 'rgba(16,185,129,.45)' : 'rgba(255,255,255,.15)',
                        color: metroPlaying ? '#10B981' : 'rgba(255,255,255,.4)',
                      }}
                    >
                      <span style={{ fontSize: 8 }}>{metroPlaying ? '◼' : '▶'}</span>
                      {metroPlaying ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {selectedSegmentId ? (
                    <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>
                      🎯 {selIdx + 1}구간 전용
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(212,168,67,.1)', color: 'rgba(212,168,67,.7)' }}>
                      🌐 전체 기본값
                    </span>
                  )}
                </div>

                {/* ── Stealth Metronome ── */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[rgba(255,255,255,.7)]">Stealth Metronome</span>
                      <div className="relative">
                        <button
                          onClick={() => setShowGhostInfo(v => !v)}
                          onMouseDown={e => e.stopPropagation()}
                          className="w-4 h-4 rounded-full border text-[9px] font-bold flex items-center justify-center transition-colors"
                          style={{ borderColor: 'rgba(255,255,255,.25)', color: 'rgba(255,255,255,.4)' }}
                        >i</button>
                        {showGhostInfo && (
                          <div
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 w-52 text-[10px] leading-relaxed rounded-lg p-2.5"
                            style={{ background: 'rgba(30,36,48,.98)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.65)' }}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            연습 세트 중 메트로놈이 자동으로 무음(Stealth) 상태가 됩니다. 소리 없이 내면의 박자감만으로 템포를 유지하며 연주를 완주하세요.
                          </div>
                        )}
                      </div>
                    </div>
                    {ghostActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse"
                        style={{ background: 'rgba(155,127,200,.15)', color: '#9b7fc8', border: '1px solid rgba(155,127,200,.3)' }}>
                        진행 중
                      </span>
                    )}
                  </div>

                  {/* 구간 길이 + READY — 같은 행 */}
                  <div className="flex items-end gap-2 mb-3">
                    {/* 구간 길이 */}
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-[9px] text-[rgba(255,255,255,.35)]">구간 길이</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPanelGhostBars(v => Math.max(1, v - 1))}
                          className="rounded border text-[10px] font-bold flex-shrink-0"
                          style={{ width: 22, height: 22, background: 'rgba(255,255,255,.05)', borderColor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)' }}
                        >–</button>
                        <input
                          type="number" min={1} max={32}
                          value={panelGhostBars}
                          onChange={e => setPanelGhostBars(Math.max(1, Math.min(32, Number(e.target.value))))}
                          className="rounded border text-center font-mono text-[12px] font-bold bg-transparent outline-none"
                          style={{ width: 34, height: 22, borderColor: 'rgba(155,127,200,.4)', color: '#9b7fc8' }}
                        />
                        <button
                          onClick={() => setPanelGhostBars(v => Math.min(32, v + 1))}
                          className="rounded border text-[10px] font-bold flex-shrink-0"
                          style={{ width: 22, height: 22, background: 'rgba(155,127,200,.1)', borderColor: 'rgba(155,127,200,.25)', color: '#9b7fc8' }}
                        >+</button>
                        <span className="text-[9px] text-[rgba(255,255,255,.3)]">마디</span>
                      </div>
                    </div>

                    {/* READY */}
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-[9px] text-[rgba(255,255,255,.35)]">READY</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPanelReadyBars(v => Math.max(1, v - 1))}
                          className="rounded border text-[10px] font-bold flex-shrink-0"
                          style={{ width: 22, height: 22, background: 'rgba(255,255,255,.05)', borderColor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)' }}
                        >–</button>
                        <input
                          type="number" min={1} max={8}
                          value={panelReadyBars}
                          onChange={e => setPanelReadyBars(Math.max(1, Math.min(8, Number(e.target.value))))}
                          className="rounded border text-center font-mono text-[12px] font-bold bg-transparent outline-none"
                          style={{ width: 34, height: 22, borderColor: 'rgba(212,168,67,.4)', color: '#d4a843' }}
                        />
                        <button
                          onClick={() => setPanelReadyBars(v => Math.min(8, v + 1))}
                          className="rounded border text-[10px] font-bold flex-shrink-0"
                          style={{ width: 22, height: 22, background: 'rgba(212,168,67,.1)', borderColor: 'rgba(212,168,67,.25)', color: '#d4a843' }}
                        >+</button>
                        <span className="text-[9px] text-[rgba(255,255,255,.3)]">마디</span>
                      </div>
                    </div>
                  </div>

                  {/* Ghost Train 시작 / 중지 버튼 */}
                  {ghostActive ? (
                    <button
                      onClick={() => { setGhostActive(false); setGhostPhase(''); metro.setMetroPlaying(false); }}
                      className="w-full h-8 rounded-lg text-[11.5px] font-semibold transition-all"
                      style={{
                        background: 'rgba(224,112,112,.12)',
                        border: '1px solid rgba(224,112,112,.35)',
                        color: '#e07070',
                      }}
                    >
                      ■ Stealth Metronome 중지
                    </button>
                  ) : (
                    <button
                      onClick={startGhostTrain}
                      disabled={!metroPlaying}
                      className="w-full h-8 rounded-lg text-[11.5px] font-semibold transition-all"
                      style={{
                        background: !metroPlaying ? 'rgba(155,127,200,.06)' : 'rgba(155,127,200,.18)',
                        border: `1px solid ${!metroPlaying ? 'rgba(155,127,200,.15)' : 'rgba(155,127,200,.45)'}`,
                        color: !metroPlaying ? 'rgba(155,127,200,.35)' : '#9b7fc8',
                        cursor: !metroPlaying ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ▶ Stealth Metronome 시작
                    </button>
                  )}
                  {!metroPlaying && !ghostActive && (
                    <p className="text-[9px] text-center mt-1" style={{ color: 'rgba(255,255,255,.25)' }}>
                      메트로놈을 먼저 켜주세요
                    </p>
                  )}
                </div>

                <div className="w-full h-px bg-[rgba(255,255,255,.06)] mb-4" />

                {/* ── 서브디비전 ── */}
                <div className="mb-4">
                  <div className="text-[10px] text-[rgba(255,255,255,.35)] mb-2">서브디비전</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { val: 1, label: '♩', sub: '1분할' },
                      { val: 2, label: '♫', sub: '8분' },
                      { val: 3, label: '3', sub: '셋잇단' },
                      { val: 4, label: '♬', sub: '16분' },
                    ].map(({ val, label, sub }) => (
                      <button
                        key={val}
                        onClick={() => setPanelSubdiv(val)}
                        className="flex flex-col items-center py-1.5 rounded-lg border transition-all"
                        style={{
                          background: panelSubdiv === val ? 'rgba(212,168,67,.18)' : 'rgba(255,255,255,.04)',
                          borderColor: panelSubdiv === val ? 'rgba(212,168,67,.5)' : 'rgba(255,255,255,.08)',
                          color: panelSubdiv === val ? '#d4a843' : 'rgba(255,255,255,.45)',
                        }}
                      >
                        <span className="text-[14px] leading-none">{label}</span>
                        <span className="text-[8px] mt-0.5 opacity-70">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full h-px bg-[rgba(255,255,255,.06)] mb-4" />

                {/* ── IN [N] 박자 기호 ── */}
                <div className="mb-4">
                  <div className="text-[10px] text-[rgba(255,255,255,.35)] mb-2">박자 기호</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[rgba(255,255,255,.5)]">IN</span>
                    {beatsEditing ? (
                      <input
                        type="number" min={1} max={16}
                        value={panelBeats}
                        autoFocus
                        onChange={e => setPanelBeats(Number(e.target.value))}
                        onBlur={() => { setPanelBeats(v => Math.max(1, Math.min(16, v))); setBeatsEditing(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { setPanelBeats(v => Math.max(1, Math.min(16, v))); setBeatsEditing(false); } }}
                        className="w-12 h-8 rounded-lg border text-center font-mono text-[14px] font-bold bg-transparent outline-none"
                        style={{ borderColor: 'rgba(212,168,67,.5)', color: '#d4a843' }}
                      />
                    ) : (
                      <button
                        onClick={() => setBeatsEditing(true)}
                        className="w-12 h-8 rounded-lg border font-mono text-[14px] font-bold transition-all"
                        style={{ background: 'rgba(212,168,67,.08)', borderColor: 'rgba(212,168,67,.3)', color: '#d4a843' }}
                      >
                        {panelBeats}
                      </button>
                    )}
                    <span className="text-[10px] text-[rgba(255,255,255,.3)]">박자/마디</span>
                  </div>
                </div>

                <div className="w-full h-px bg-[rgba(255,255,255,.06)] mb-4" />

                {/* ── BPM 조작 ── */}
                <div className="mb-4">
                  <div className="text-[10px] text-[rgba(255,255,255,.35)] mb-2">BPM</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={() => setPanelBpm(v => Math.max(20, v - 5))}
                      className="w-9 h-8 rounded-lg border text-[11px] font-bold"
                      style={{ background: 'rgba(255,255,255,.05)', borderColor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)' }}>
                      –5
                    </button>
                    <button onClick={() => setPanelBpm(v => Math.max(20, v - 1))}
                      className="w-9 h-8 rounded-lg border text-[12px] font-bold"
                      style={{ background: 'rgba(255,255,255,.05)', borderColor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)' }}>
                      –1
                    </button>

                    {bpmEditing ? (
                      <input
                        type="number" min={20} max={240}
                        value={panelBpm}
                        autoFocus
                        onChange={e => setPanelBpm(Number(e.target.value))}
                        onBlur={() => { setPanelBpm(v => Math.max(20, Math.min(240, v))); setBpmEditing(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { setPanelBpm(v => Math.max(20, Math.min(240, v))); setBpmEditing(false); } }}
                        className="w-14 h-9 rounded-lg border text-center font-mono text-[18px] font-bold bg-transparent outline-none"
                        style={{ borderColor: 'rgba(212,168,67,.6)', color: '#d4a843' }}
                      />
                    ) : (
                      <button
                        onClick={() => setBpmEditing(true)}
                        className="w-14 h-9 rounded-lg border font-mono text-[20px] font-bold transition-all"
                        style={{ background: 'rgba(212,168,67,.08)', borderColor: 'rgba(212,168,67,.3)', color: '#d4a843' }}
                      >
                        {panelBpm}
                      </button>
                    )}

                    <button onClick={() => setPanelBpm(v => Math.min(240, v + 1))}
                      className="w-9 h-8 rounded-lg border text-[12px] font-bold"
                      style={{ background: 'rgba(255,255,255,.05)', borderColor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)' }}>
                      +1
                    </button>
                    <button onClick={() => setPanelBpm(v => Math.min(240, v + 5))}
                      className="w-9 h-8 rounded-lg border text-[11px] font-bold"
                      style={{ background: 'rgba(212,168,67,.1)', borderColor: 'rgba(212,168,67,.25)', color: '#d4a843' }}>
                      +5
                    </button>
                  </div>
                </div>

                {/* ── 확인 버튼 ── */}
                <button
                  onClick={confirmMetro}
                  className="w-full h-8 rounded-lg text-[12px] font-semibold transition-all"
                  style={{
                    background: selectedSegmentId ? 'rgba(16,185,129,.18)' : 'rgba(212,168,67,.18)',
                    border: `1px solid ${selectedSegmentId ? 'rgba(16,185,129,.4)' : 'rgba(212,168,67,.4)'}`,
                    color: selectedSegmentId ? '#10B981' : '#d4a843',
                  }}
                >
                  확인
                </button>
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
    </>
  );
}
