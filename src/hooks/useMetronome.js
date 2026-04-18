// src/hooks/useMetronome.js
// ─────────────────────────────────────────────────────────────────────────────
// Web Audio API 기반 메트로놈 엔진.
// AudioContext 스케줄러 패턴 — lookahead 0.1s, interval 25ms
//
// 지원 기능:
//   • subdivision (1/2/3/4) — Quarter / Eighth / Triplet / Sixteenth
//   • 오디오 계층: Accent(강박) > Beat(약박) > Sub-click(분할박)
//   • ghostTrain — 3세트 구조에서 무작위 1세트 무음 (Inner Clock 훈련)
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect } from 'react';

/**
 * @param {object} params
 * @param {number}   params.bpm
 * @param {number}   params.beatsPerBar
 * @param {number}   params.subdivision       — 1|2|3|4
 * @param {boolean}  params.playing
 * @param {(beat:number)=>void} params.onBeat — 메인 박(beat) 발화 시 콜백
 * @param {{
 *   enabled: boolean,
 *   bars: number,
 *   ghostSetIdx: number,
 *   onPhaseChange: (phase:string)=>void
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

  // props → ref 미러링 (클로저 stale 방지)
  const bpmRef      = useRef(bpm);
  const bpbRef      = useRef(beatsPerBar);
  const subdivRef   = useRef(subdivision);
  const onBeatRef   = useRef(onBeat);

  useEffect(() => { bpmRef.current    = bpm; },        [bpm]);
  useEffect(() => { bpbRef.current    = beatsPerBar; },[beatsPerBar]);
  useEffect(() => { subdivRef.current = subdivision; },[subdivision]);
  useEffect(() => { onBeatRef.current = onBeat; },     [onBeat]);

  // Ghost Train refs
  const ghostEnabledRef  = useRef(ghostTrain.enabled    ?? false);
  const ghostBarsRef     = useRef(ghostTrain.bars        ?? 8);
  const ghostSetIdxRef   = useRef(ghostTrain.ghostSetIdx ?? 1);
  const onPhaseChangeRef = useRef(ghostTrain.onPhaseChange ?? null);
  const barIndexRef      = useRef(0);  // 타임라인 내 현재 바 인덱스 (0 = countIn)
  const beatInBarRef     = useRef(0);  // 현재 바 내 메인 박 누적
  const lastPhaseRef     = useRef(''); // 직전 페이즈 (중복 콜백 방지)

  useEffect(() => { ghostEnabledRef.current  = ghostTrain.enabled       ?? false; }, [ghostTrain.enabled]);
  useEffect(() => { ghostBarsRef.current     = ghostTrain.bars          ?? 8;     }, [ghostTrain.bars]);
  useEffect(() => { ghostSetIdxRef.current   = ghostTrain.ghostSetIdx   ?? 1;     }, [ghostTrain.ghostSetIdx]);
  useEffect(() => { onPhaseChangeRef.current = ghostTrain.onPhaseChange ?? null;  }, [ghostTrain.onPhaseChange]);

  // ── Ghost Train 페이즈 계산 (무한반복) ──────────────────────────────────
  // bar 0 → countIn
  // 이후 (2N+2) 마디 주기로 반복:
  //   pos 0..N-1   → normal (홀수 세트)
  //   pos N        → break
  //   pos N+1..2N  → ghost  (짝수 세트, 무음)
  //   pos 2N+1     → break
  function computeGhostPhase(barIdx, N) {
    if (barIdx === 0) return 'countIn';
    const cycleLen = 2 * N + 2;
    const pos = (barIdx - 1) % cycleLen;
    if (pos < N)          return 'normal';
    if (pos === N)        return 'break';
    if (pos < 2 * N + 1)  return 'ghost';
    return 'break';
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

      // ── Ghost Train: 새 바 시작 시 페이즈 전환 감지 ──────────────
      if (ghostEnabledRef.current && isMainBeat && beatIdx === 0) {
        const N     = ghostBarsRef.current;
        const phase = computeGhostPhase(barIndexRef.current, N);

        if (phase !== lastPhaseRef.current) {
          lastPhaseRef.current = phase;
          const delay    = Math.max(0, (time - ctx.currentTime) * 1000);
          const captured = phase;
          setTimeout(() => { onPhaseChangeRef.current?.(captured); }, delay);
        }
      }

      // ── Ghost Train: 뮤트 여부 결정 (ghost 세트만 무음) ─────────────
      let muted = false;
      if (ghostEnabledRef.current) {
        const phase = computeGhostPhase(barIndexRef.current, ghostBarsRef.current);
        if (phase === 'ghost') muted = true;
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
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    tickCountRef.current = 0;
    nextTimeRef.current  = ctxRef.current.currentTime + 0.05;
    barIndexRef.current  = 0;
    beatInBarRef.current = 0;
    lastPhaseRef.current = '';
    timerRef.current = setInterval(schedule, 25);
  }, [schedule]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // playing / bpm / subdivision 변화 시 재시작
  useEffect(() => {
    if (playing) { stop(); start(); }
    else          { stop(); }
    return stop;
  }, [playing, bpm, beatsPerBar, subdivision, start, stop]);

  // 언마운트 정리
  useEffect(() => () => {
    stop();
    ctxRef.current?.close();
  }, [stop]);
}
