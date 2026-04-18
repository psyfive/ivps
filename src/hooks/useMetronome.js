// src/hooks/useMetronome.js
// ─────────────────────────────────────────────────────────────────────────────
// Web Audio API 기반 메트로놈 엔진.
// AudioContext 스케줄러 패턴 — lookahead 0.1s, interval 25ms
//
// 지원 기능:
//   • subdivision (1/2/3/4) — Quarter / Eighth / Triplet / Sixteenth
//   • 오디오 계층: Accent(강박) > Beat(약박) > Sub-click(분활박)
//   • ghostTrain — Normal/Ghost 무한반복, READY 마디 가변
//
// AudioContext 싱글톤: 모듈 레벨에서 하나의 컨텍스트를 공유해
// 컴포넌트 mount/unmount 시 컨텍스트가 재생성·재개 불가 상태가 되는
// 브라우저 autoplay 정책 이슈를 방지한다.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect } from 'react';

// ── AudioContext 싱글톤 ────────────────────────────────────────────────────
let _sharedCtx = null;

function getSharedCtx() {
  if (!_sharedCtx || _sharedCtx.state === 'closed') {
    _sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_sharedCtx.state === 'suspended') _sharedCtx.resume();
  return _sharedCtx;
}

/**
 * @param {object} params
 * @param {number}   params.bpm
 * @param {number}   params.beatsPerBar
 * @param {number}   params.subdivision       — 1|2|3|4
 * @param {boolean}  params.playing
 * @param {(beat:number)=>void} params.onBeat
 * @param {{
 *   enabled: boolean,
 *   bars: number,
 *   readyBars: number,
 *   onPhaseChange: (phase:string)=>void,
 *   onBarChange: (phase:string, barInPhase:number, totalBars:number)=>void,
 * }} [params.ghostTrain]
 */
export function useMetronome({
  bpm,
  beatsPerBar,
  subdivision = 1,
  playing,
  onBeat,
  ghostTrain = { enabled: false },
}) {
  const ctxRef       = useRef(null);
  const nextTimeRef  = useRef(0);
  const tickCountRef = useRef(0);
  const timerRef     = useRef(null);

  // props → ref 미러링
  const bpmRef      = useRef(bpm);
  const bpbRef      = useRef(beatsPerBar);
  const subdivRef   = useRef(subdivision);
  const onBeatRef   = useRef(onBeat);

  useEffect(() => { bpmRef.current    = bpm; },        [bpm]);
  useEffect(() => { bpbRef.current    = beatsPerBar; },[beatsPerBar]);
  useEffect(() => { subdivRef.current = subdivision; },[subdivision]);
  useEffect(() => { onBeatRef.current = onBeat; },     [onBeat]);

  // Ghost Train refs
  const ghostEnabledRef    = useRef(ghostTrain.enabled      ?? false);
  const ghostBarsRef       = useRef(ghostTrain.bars          ?? 8);
  const ghostReadyBarsRef  = useRef(ghostTrain.readyBars     ?? 1);
  const onPhaseChangeRef   = useRef(ghostTrain.onPhaseChange ?? null);
  const onBarChangeRef     = useRef(ghostTrain.onBarChange   ?? null);
  const barIndexRef        = useRef(0);
  const beatInBarRef       = useRef(0);
  const lastPhaseRef       = useRef('');

  useEffect(() => { ghostEnabledRef.current   = ghostTrain.enabled      ?? false; }, [ghostTrain.enabled]);
  useEffect(() => { ghostBarsRef.current      = ghostTrain.bars          ?? 8;    }, [ghostTrain.bars]);
  useEffect(() => { ghostReadyBarsRef.current = ghostTrain.readyBars     ?? 1;    }, [ghostTrain.readyBars]);
  useEffect(() => { onPhaseChangeRef.current  = ghostTrain.onPhaseChange ?? null; }, [ghostTrain.onPhaseChange]);
  useEffect(() => { onBarChangeRef.current    = ghostTrain.onBarChange   ?? null; }, [ghostTrain.onBarChange]);

  // ── Ghost Train 페이즈 + 바 위치 계산 ───────────────────────────────────
  // N = setLength bars, R = readyBars
  // cycleLen = 2N + 2R
  // pos 0..N-1         → 'normal',  barInPhase = pos+1,         total = N
  // pos N..N+R-1       → 'break',   barInPhase = pos-N+1,       total = R
  // pos N+R..2N+R-1    → 'ghost',   barInPhase = pos-N-R+1,     total = N
  // pos 2N+R..2N+2R-1  → 'break',   barInPhase = pos-2N-R+1,    total = R
  function computeGhostInfo(barIdx, N, R) {
    if (barIdx === 0) return { phase: 'countIn', barInPhase: 1, totalBars: 1 };
    const cycleLen = 2 * N + 2 * R;
    const pos = (barIdx - 1) % cycleLen;
    if (pos < N)                 return { phase: 'normal', barInPhase: pos + 1,           totalBars: N };
    if (pos < N + R)             return { phase: 'break',  barInPhase: pos - N + 1,       totalBars: R };
    if (pos < 2 * N + R)        return { phase: 'ghost',  barInPhase: pos - N - R + 1,   totalBars: N };
    return                              { phase: 'break',  barInPhase: pos - 2*N - R + 1, totalBars: R };
  }

  // ── 단일 오실레이터 스케줄 ───────────────────────────────────────────────
  const scheduleOsc = useCallback((time, freq, gainVal, duration) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.start(time);
    osc.stop(time + duration + 0.005);
  }, []);

  // ── 스케줄러 루프 ─────────────────────────────────────────────────────────
  const schedule = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    while (nextTimeRef.current < ctx.currentTime + 0.1) {
      const subdiv     = subdivRef.current;
      const bpb        = bpbRef.current;
      const subIdx     = tickCountRef.current % subdiv;
      const beatIdx    = Math.floor(tickCountRef.current / subdiv) % bpb;
      const isAccent   = beatIdx === 0 && subIdx === 0;
      const isMainBeat = subIdx === 0;
      const time       = nextTimeRef.current;

      // ── Ghost Train: 새 바 시작 시 페이즈/바 콜백 ────────────────
      if (ghostEnabledRef.current && isMainBeat && beatIdx === 0) {
        const N    = ghostBarsRef.current;
        const R    = ghostReadyBarsRef.current;
        const info = computeGhostInfo(barIndexRef.current, N, R);
        const delay = Math.max(0, (time - ctx.currentTime) * 1000);

        // 페이즈 변경 콜백
        if (info.phase !== lastPhaseRef.current) {
          lastPhaseRef.current = info.phase;
          const captured = info.phase;
          setTimeout(() => { onPhaseChangeRef.current?.(captured); }, delay);
        }

        // 바 카운터 콜백 (매 바마다)
        const capturedInfo = info;
        setTimeout(() => { onBarChangeRef.current?.(capturedInfo.phase, capturedInfo.barInPhase, capturedInfo.totalBars); }, delay);
      }

      // ── Ghost Train: ghost 세트만 무음 ───────────────────────────
      let muted = false;
      if (ghostEnabledRef.current) {
        const info = computeGhostInfo(barIndexRef.current, ghostBarsRef.current, ghostReadyBarsRef.current);
        if (info.phase === 'ghost') muted = true;
      }

      // ── 오디오 스케줄 ────────────────────────────────────────────
      if (!muted) {
        if (isAccent) {
          scheduleOsc(time, 1100, 0.42, 0.048);
        } else if (isMainBeat) {
          scheduleOsc(time, 880, 0.26, 0.048);
        } else {
          scheduleOsc(time, 660, 0.11, 0.028);
        }
      }

      // UI 콜백 — 메인 박에만
      if (isMainBeat) {
        const delay        = Math.max(0, (time - ctx.currentTime) * 1000);
        const capturedBeat = beatIdx;
        setTimeout(() => { onBeatRef.current?.(capturedBeat); }, delay);
      }

      tickCountRef.current++;
      nextTimeRef.current += (60 / bpmRef.current) / subdiv;

      // Ghost Train 바/박 카운터 — 메인 박에서만 전진
      if (ghostEnabledRef.current && isMainBeat) {
        beatInBarRef.current++;
        if (beatInBarRef.current >= bpb) {
          beatInBarRef.current = 0;
          barIndexRef.current++;
        }
      }
    }
  }, [scheduleOsc]);

  // ── 시작 / 정지 ──────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const ctx = getSharedCtx();
    ctxRef.current       = ctx;
    tickCountRef.current = 0;
    nextTimeRef.current  = ctx.currentTime + 0.05;
    barIndexRef.current  = 0;
    beatInBarRef.current = 0;
    lastPhaseRef.current = '';
    timerRef.current = setInterval(schedule, 25);
  }, [schedule]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (playing) { stop(); start(); }
    else          { stop(); }
    return stop;
  }, [playing, bpm, beatsPerBar, subdivision, start, stop]);

  useEffect(() => () => {
    stop();
    // 공유 AudioContext는 닫지 않음 — 다음 인스턴스가 재사용
  }, [stop]);
}
