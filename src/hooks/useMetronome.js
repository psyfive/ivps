// src/hooks/useMetronome.js
// ─────────────────────────────────────────────────────────────────────────────
// Web Audio API 기반 메트로놈 엔진.
// AudioContext 스케줄러 패턴 — lookahead 0.1s, interval 25ms
// React 렌더 사이클과 완전히 분리된 Ref 기반 설계.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect } from 'react';

/**
 * @param {object} params
 * @param {number}   params.bpm          — 템포
 * @param {number}   params.beatsPerBar  — 박자 수 (보통 4)
 * @param {boolean}  params.playing      — 재생 여부 (외부 상태)
 * @param {(beat:number)=>void} params.onBeat  — 박자 tick 콜백
 */
export function useMetronome({ bpm, beatsPerBar, playing, onBeat }) {
  const ctxRef       = useRef(null);   // AudioContext
  const nextTimeRef  = useRef(0);      // 다음 비트 스케줄 시각 (ctx.currentTime 기준)
  const beatCountRef = useRef(0);      // 누적 비트 카운터
  const timerRef     = useRef(null);   // setInterval 핸들

  // bpm을 ref에도 미러링 — 클로저 stale 방지
  const bpmRef         = useRef(bpm);
  const beatsPerBarRef = useRef(beatsPerBar);
  const onBeatRef      = useRef(onBeat);

  useEffect(() => { bpmRef.current = bpm; },         [bpm]);
  useEffect(() => { beatsPerBarRef.current = beatsPerBar; }, [beatsPerBar]);
  useEffect(() => { onBeatRef.current = onBeat; },   [onBeat]);

  // ── 단일 비트 오실레이터 생성 ──────────────────────────────────────────
  const scheduleTick = useCallback((time, isAccent) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // 강박(1박): 1100Hz / 약박: 880Hz
    osc.frequency.value = isAccent ? 1100 : 880;
    gain.gain.setValueAtTime(isAccent ? 0.42 : 0.26, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    osc.start(time);
    osc.stop(time + 0.048);
  }, []);

  // ── 스케줄러 루프 (setInterval 25ms마다 실행) ─────────────────────────
  const schedule = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // lookahead 0.1s 범위까지 미리 스케줄
    while (nextTimeRef.current < ctx.currentTime + 0.1) {
      const beatIndex = beatCountRef.current % beatsPerBarRef.current;
      const isAccent  = beatIndex === 0;

      scheduleTick(nextTimeRef.current, isAccent);

      // UI 업데이트는 실제 발화 시점에 setTimeout으로 동기화
      const delay = Math.max(0, (nextTimeRef.current - ctx.currentTime) * 1000);
      const capturedBeat = beatIndex;
      setTimeout(() => { onBeatRef.current?.(capturedBeat); }, delay);

      beatCountRef.current++;
      nextTimeRef.current += 60 / bpmRef.current;
    }
  }, [scheduleTick]);

  // ── 시작 ──────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    // AudioContext 생성 (최초 1회, suspend 해제)
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }

    beatCountRef.current = 0;
    nextTimeRef.current  = ctxRef.current.currentTime + 0.05; // 50ms 딜레이로 첫 박 준비

    timerRef.current = setInterval(schedule, 25);
  }, [schedule]);

  // ── 정지 ──────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // ── playing 상태 변화 감지 → start / stop ────────────────────────────
  useEffect(() => {
    if (playing) {
      stop();   // 기존 타이머 정리 (BPM 변경 시 재시작 포함)
      start();
    } else {
      stop();
    }
    return stop; // 언마운트 시 정리
  }, [playing, bpm, beatsPerBar, start, stop]);

  // ── AudioContext 언마운트 클린업 ──────────────────────────────────────
  useEffect(() => () => {
    stop();
    ctxRef.current?.close();
  }, [stop]);
}
