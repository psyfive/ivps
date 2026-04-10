// src/hooks/useTuner.js
// ─────────────────────────────────────────────────────────────────────────────
// Web Audio API + MediaDevices 기반 피치 감지 훅.
// Autocorrelation 알고리즘으로 주파수 → 음이름 + 센트 편차 변환.
// requestAnimationFrame 루프로 실시간 업데이트.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect } from 'react';

// ── 상수 ───────────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FFT_SIZE   = 2048;
const RMS_FLOOR  = 0.01;   // 이 이하는 묵음으로 처리

// ── 순수 함수 유틸 ─────────────────────────────────────────────────────────

/**
 * Autocorrelation 기반 피치 추정.
 * @param {Float32Array} buf   — 시간 도메인 샘플 버퍼
 * @param {number}       sr    — 샘플레이트 (Hz)
 * @returns {number}  주파수(Hz), 신호 없으면 -1
 */
function autoCorrelate(buf, sr) {
  let S = buf.length, rms = 0;
  for (let i = 0; i < S; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / S);
  if (rms < RMS_FLOOR) return -1;

  // 신호 시작/끝 클리핑
  let r1 = 0, r2 = S - 1;
  const th = 0.2;
  for (let i = 0; i < S / 2; i++) { if (Math.abs(buf[i]) < th) { r1 = i; break; } }
  for (let i = 1; i < S / 2; i++) { if (Math.abs(buf[S - i]) < th) { r2 = S - i; break; } }
  buf = buf.slice(r1, r2);
  S   = buf.length;

  // Autocorrelation 계산
  const c = new Float32Array(S).fill(0);
  for (let i = 0; i < S; i++)
    for (let j = 0; j < S - i; j++)
      c[i] += buf[j] * buf[j + i];

  // 첫 번째 최솟값 이후 최댓값 찾기
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let mx = -1, mp = -1;
  for (let i = d; i < S; i++) if (c[i] > mx) { mx = c[i]; mp = i; }

  if (mp < 1 || mp >= S - 1) return sr / mp;

  // 포물선 보간으로 서브샘플 정밀도 향상
  const x1 = c[mp - 1], x2 = c[mp], x3 = c[mp + 1];
  const a  = (x1 + x3 - 2 * x2) / 2;
  const b  = (x3 - x1) / 2;
  return sr / (a ? mp - b / (2 * a) : mp);
}

/**
 * 주파수 → { name, cents, freq, octave } 변환.
 * @param {number} freq
 * @returns {{ name:string, cents:number, freq:number, octave:number } | null}
 */
function freqToNote(freq) {
  if (!freq || freq < 20 || freq > 6000) return null;
  const semitones = 12 * Math.log2(freq / 440) + 69;
  const rounded   = Math.round(semitones);
  const cents     = Math.round((semitones - rounded) * 100);
  const noteName  = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave    = Math.floor(rounded / 12) - 1;
  return {
    name:   `${noteName}${octave}`,
    note:   noteName,          // 음이름만 (옥타브 없음)
    cents,
    freq:   Math.round(freq),
    octave,
  };
}

/**
 * 센트 편차 → 색상 (인텍스: 초록=정확 / 황금=조금 어긋남 / 빨강=많이 어긋남)
 */
export function centsColor(cents) {
  const abs = Math.abs(cents);
  return abs <= 10 ? '#7ea890' : abs <= 25 ? '#d4a843' : '#e07070';
}

// ── 바이올린 개방현 참조 ──────────────────────────────────────────────────
export const VIOLIN_OPEN_STRINGS = [
  { string: 'G', note: 'G', octave: 3, freq: 196 },
  { string: 'D', note: 'D', octave: 4, freq: 294 },
  { string: 'A', note: 'A', octave: 4, freq: 440 },
  { string: 'E', note: 'E', octave: 5, freq: 659 },
];

/**
 * 감지된 음이름이 바이올린 개방현과 일치하는지 확인
 * @param {string} noteName — 'G', 'D', 'A', 'E' 등
 * @returns {string|null} 일치하는 현 이름
 */
export function matchOpenString(noteName) {
  if (!noteName) return null;
  return VIOLIN_OPEN_STRINGS.find(s => noteName.startsWith(s.note))?.string ?? null;
}

// ── 메인 훅 ────────────────────────────────────────────────────────────────

/**
 * useTuner
 *
 * @param {object}   params
 * @param {boolean}  params.active            — 튜너 활성화 여부 (외부 상태)
 * @param {(note: NoteResult|null) => void} params.onNote — 음 감지 콜백
 *
 * @returns {{ start: ()=>void, stop: ()=>void }}
 *
 * NoteResult = { name, note, cents, freq, octave }
 */
export function useTuner({ active, onNote }) {
  const streamRef   = useRef(null);  // MediaStream
  const ctxRef      = useRef(null);  // AudioContext
  const analyserRef = useRef(null);  // AnalyserNode
  const rafRef      = useRef(null);  // rAF 핸들
  const onNoteRef   = useRef(onNote);

  useEffect(() => { onNoteRef.current = onNote; }, [onNote]);

  // ── 피치 감지 루프 ──────────────────────────────────────────────────
  const detectLoop = useCallback(() => {
    if (!analyserRef.current) return;

    const buf = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buf);

    const freq = autoCorrelate(buf, ctxRef.current.sampleRate);
    onNoteRef.current?.(freqToNote(freq));

    rafRef.current = requestAnimationFrame(detectLoop);
  }, []);

  // ── 시작 ───────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false },
        video: false,
      });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyserRef.current = analyser;

      ctx.createMediaStreamSource(stream).connect(analyser);
      detectLoop();

      return true;
    } catch (err) {
      console.error('[useTuner] 마이크 접근 실패:', err);
      throw err; // 호출부에서 alert 처리
    }
  }, [detectLoop]);

  // ── 정지 ───────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close();
    streamRef.current = ctxRef.current = analyserRef.current = null;
    onNoteRef.current?.(null);
  }, []);

  // ── active 변화 감지 → start / stop ────────────────────────────────
  useEffect(() => {
    if (active) {
      start().catch(() => {}); // 에러는 start() 내에서 throw, 호출부 catch
    } else {
      stop();
    }
    return stop;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  // ↑ start/stop은 useCallback 메모이제이션 되어 있으나 active 변경에만 반응

  // ── 언마운트 클린업 ──────────────────────────────────────────────
  useEffect(() => stop, [stop]);

  return { start, stop, freqToNote, centsColor };
}

// 편의 re-export
export { freqToNote };
