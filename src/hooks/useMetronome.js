// src/hooks/useMetronome.js
// ─────────────────────────────────────────────────────────────────────────────
// Web Audio API 기반 메트로놈 엔진.
// AudioContext 스케줄러 패턴 — lookahead 0.1s, interval 25ms
//
// 지원 기능:
//   • subdivision (1/2/3/4) — Quarter / Eighth / Triplet / Sixteenth
//   • 오디오 계층: Accent(강박) > Beat(약박) > Sub-click(분할박)
//   • randomMute — 설정 확률로 발음 생략 (Inner Clock 훈련)
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect } from 'react';

/**
 * @param {object} params
 * @param {number}   params.bpm
 * @param {number}   params.beatsPerBar
 * @param {number}   params.subdivision       — 1|2|3|4
 * @param {boolean}  params.randomMuteEnabled
 * @param {number}   params.randomMuteProb    — 0~100
 * @param {boolean}  params.playing
 * @param {(beat:number)=>void} params.onBeat — 메인 박(beat) 발화 시 콜백
 */
export function useMetronome({
  bpm,
  beatsPerBar,
  subdivision = 1,
  randomMuteEnabled = false,
  randomMuteProb = 40,
  playing,
  onBeat,
}) {
  const ctxRef       = useRef(null);
  const nextTimeRef  = useRef(0);
  const tickCountRef = useRef(0); // subdivision 포함 전체 tick 카운터
  const timerRef     = useRef(null);

  // props → ref 미러링 (클로저 stale 방지)
  const bpmRef      = useRef(bpm);
  const bpbRef      = useRef(beatsPerBar);
  const subdivRef   = useRef(subdivision);
  const muteOnRef   = useRef(randomMuteEnabled);
  const muteProbRef = useRef(randomMuteProb);
  const onBeatRef   = useRef(onBeat);

  useEffect(() => { bpmRef.current      = bpm; },              [bpm]);
  useEffect(() => { bpbRef.current      = beatsPerBar; },      [beatsPerBar]);
  useEffect(() => { subdivRef.current   = subdivision; },      [subdivision]);
  useEffect(() => { muteOnRef.current   = randomMuteEnabled; },[randomMuteEnabled]);
  useEffect(() => { muteProbRef.current = randomMuteProb; },   [randomMuteProb]);
  useEffect(() => { onBeatRef.current   = onBeat; },           [onBeat]);

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
      const subIdx     = tickCountRef.current % subdiv;         // 0 = main beat
      const beatIdx    = Math.floor(tickCountRef.current / subdiv) % bpb;
      const isAccent   = beatIdx === 0 && subIdx === 0;
      const isMainBeat = subIdx === 0;
      const time       = nextTimeRef.current;

      // 랜덤 뮤트 적용
      const muted = muteOnRef.current && Math.random() * 100 < muteProbRef.current;

      if (!muted) {
        if (isAccent) {
          scheduleOsc(time, 1100, 0.42, 0.048); // 강박 — 높은 피치, 강한 볼륨
        } else if (isMainBeat) {
          scheduleOsc(time, 880, 0.26, 0.048);  // 약박 — 기본 클릭
        } else {
          scheduleOsc(time, 660, 0.11, 0.028);  // 서브디비전 — 낮은 피치, 약한 볼륨
        }
      }

      // UI 콜백은 메인 박에만 발화
      if (isMainBeat) {
        const delay = Math.max(0, (time - ctx.currentTime) * 1000);
        const capturedBeat = beatIdx;
        setTimeout(() => { onBeatRef.current?.(capturedBeat); }, delay);
      }

      tickCountRef.current++;
      nextTimeRef.current += (60 / bpmRef.current) / subdiv;
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
    timerRef.current = setInterval(schedule, 25);
  }, [schedule]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // playing 변화 또는 bpm/subdivision 변화 시 재시작
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
