// src/components/layout/RightUtilPanel.jsx  (v2 — hooks 분리 버전)
// ─────────────────────────────────────────────────────────────────────────────
// useMetronome / useTuner 훅을 사용하는 리팩터링 버전.
// AudioContext 로직이 훅으로 이동되어 이 파일은 순수 UI만 담당.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { useMetronome } from '../../hooks/useMetronome';
import { useTuner, centsColor, VIOLIN_OPEN_STRINGS } from '../../hooks/useTuner';

// ── UtilCard 공통 래퍼 ─────────────────────────────────────────────────────
function UtilCard({ icon, title, children }) {
  return (
    <div className="ivps-util-card p-[15px] mb-3 rounded-[10px]">
      <div className="text-[10.5px] text-[var(--ivps-text3)] ...">
        <span>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metronome UI
// ─────────────────────────────────────────────────────────────────────────────
function Metronome() {
  const { bpm, beatsPerBar, metroPlaying, currentBeat, metro } = usePractice();

  // 훅 연결 — 비트 tick 시 Context에 현재 박자 저장
  useMetronome({
    bpm,
    beatsPerBar,
    playing: metroPlaying,
    onBeat: useCallback(beat => metro.setCurrentBeat(beat), [metro]),
  });

  const BPM_PRESETS = [60, 80, 100, 120];

  return (
    <UtilCard icon="🔊" title="메트로놈">
      {/* 박자 트랙 */}
      <div className="flex gap-1.5 mb-3">
        {Array.from({ length: beatsPerBar }, (_, i) => {
          const isActive = metroPlaying && i === currentBeat;
          return (
            <div
              key={i}
              className="flex-1 h-[3px] rounded-sm transition-all duration-[60ms]"
              style={{
                background: isActive
                  ? i === 0 ? '#d4a843' : 'rgba(212,168,67,.5)'
                  : '#1a2035',
              }}
            />
          );
        })}
      </div>

      {/* BPM 디스플레이 */}
      <div className="text-center mb-3">
        <div className="font-serif text-[34px] font-bold text-[var(--ivps-text1)] leading-none">
          {bpm}
        </div>
        <div className="font-mono text-[10px] text-[var(--ivps-text3)] mt-0.5">BPM</div>
      </div>

      {/* 슬라이더 + ±5 */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <button
          onClick={() => metro.setBpm(bpm - 5)}
          className="w-8 h-8 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-md text-[var(--ivps-text1)] text-sm font-mono flex items-center justify-center hover:bg-[#222b3d] transition-colors flex-shrink-0"
        >
          −
        </button>
        <input
          type="range" min="20" max="240" value={bpm}
          onChange={e => metro.setBpm(Number(e.target.value))}
          className="flex-1 cursor-pointer"
          style={{ accentColor: '#d4a843' }}
        />
        <button
          onClick={() => metro.setBpm(bpm + 5)}
          className="w-8 h-8 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-md text-[var(--ivps-text1)] text-sm font-mono flex items-center justify-center hover:bg-[#222b3d] transition-colors flex-shrink-0"
        >
          +
        </button>
      </div>

      {/* BPM 프리셋 */}
      <div className="flex gap-1 mb-2.5">
        {BPM_PRESETS.map(v => (
          <button
            key={v}
            onClick={() => metro.setBpm(v)}
            className={[
              'flex-1 py-1 rounded text-[10px] font-mono border transition-colors',
              bpm === v
                ? 'bg-[rgba(212,168,67,.15)] border-[#d4a843] text-[var(--ivps-gold)]'
                : 'bg-[var(--ivps-surface2)] border-[var(--ivps-border2)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
            ].join(' ')}
          >
            {v}
          </button>
        ))}
      </div>

      {/* 시작 / 정지 */}
      <button
        onClick={() => metro.setMetroPlaying(!metroPlaying)}
        className={[
          'w-full py-2.5 rounded-lg text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-all',
          metroPlaying
              ? 'border text-[var(--ivps-gold)] bg-[var(--ivps-gold-bg)] border-[var(--ivps-gold-border)]'
               : 'ivps-btn-gold border-none',
        ].join(' ')}
      >
        {metroPlaying ? '⏸ 정지' : '▶ 시작'}
      </button>
    </UtilCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tuner UI
// ─────────────────────────────────────────────────────────────────────────────
function Tuner() {
  const { tunerActive, tunerNote, tuner } = usePractice();

  // 훅 연결 — 음 감지 시 Context에 저장
  const { start, stop } = useTuner({
    active: tunerActive,
    onNote: useCallback(note => tuner.setTunerNote(note), [tuner]),
  });

  const handleToggle = useCallback(async () => {
    if (tunerActive) {
      stop();
      tuner.setTunerActive(false);
    } else {
      try {
        await start();
        tuner.setTunerActive(true);
      } catch {
        alert('마이크 권한이 필요합니다.\n브라우저에서 마이크 접근을 허용해주세요.');
      }
    }
  }, [tunerActive, tuner, start, stop]);

  const nt         = tunerNote;
  const noteColor  = nt ? centsColor(nt.cents) : '#2a3048';
  const needleLeft = nt ? Math.max(0, Math.min(100, 50 + nt.cents)) : 50;

  // 개방현 매칭
  const matchedString = nt
    ? VIOLIN_OPEN_STRINGS.find(s => nt.note === s.note)?.string ?? null
    : null;

  return (
    <UtilCard icon="🎙" title="튜너">
      {/* 음이름 디스플레이 */}
      <div className="text-center py-3 px-3 bg-[var(--ivps-bg)] rounded-lg border border-[var(--ivps-border)] mb-2.5 min-h-[76px] flex flex-col items-center justify-center">
        <div
          className="font-serif text-[36px] font-bold leading-none transition-colors duration-75"
          style={{ color: noteColor }}
        >
          {nt ? nt.name : '—'}
        </div>

        {nt ? (
          <>
            <div className="w-full h-[5px] bg-[var(--ivps-surface2)] rounded-full mt-2 mb-1 relative overflow-hidden">
              <div
                className="absolute top-0 h-full w-[10px] -translate-x-1/2 rounded transition-all duration-75"
                style={{ left: `${needleLeft}%`, background: noteColor }}
              />
              <div className="absolute left-1/2 top-0 h-full w-px bg-[#3d4455] -translate-x-1/2" />
            </div>
            <div className="font-mono text-[10px] text-[var(--ivps-text3)]">
              {nt.cents > 0 ? '+' : ''}{nt.cents}¢ · {nt.freq}Hz
            </div>
          </>
        ) : (
          <div className="text-[11px] mt-1" style={{ color: tunerActive ? '#4a5568' : '#2a3048' }}>
            {tunerActive ? '소리를 내주세요...' : '마이크 비활성'}
          </div>
        )}
      </div>

      {/* 바이올린 개방현 인디케이터 */}
      <div className="grid grid-cols-4 gap-1 mb-2.5">
        {VIOLIN_OPEN_STRINGS.map(({ string, note: n, octave }) => (
          <div
            key={string}
            className={[
              'text-center py-1.5 rounded border text-[10px] font-mono transition-colors',
              matchedString === string
                ? 'bg-[rgba(126,168,144,.12)] border-[#7ea890]'
                : 'bg-[var(--ivps-surface2)] border-[var(--ivps-border)]',
            ].join(' ')}
          >
            <div className="text-[8px] opacity-50" style={{ color: matchedString === string ? '#7ea890' : '#3d4455' }}>
              {n}{octave}
            </div>
            <div style={{ color: matchedString === string ? '#7ea890' : '#4a5568' }}>
              {string}
            </div>
          </div>
        ))}
      </div>

      {/* 마이크 토글 */}
      <button
        onClick={handleToggle}
        className={[
          'w-full py-2 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all border',
          tunerActive
            ? 'bg-[rgba(126,168,144,.12)] border-[#7ea890] text-[var(--ivps-moss)]'
            : 'bg-[var(--ivps-surface2)] border-[var(--ivps-border2)] text-[var(--ivps-text3)] hover:bg-[#222b3d] hover:text-[var(--ivps-text2)]',
        ].join(' ')}
      >
        {tunerActive ? '🎙 튜너 끄기' : '🎙 마이크 켜기'}
      </button>
    </UtilCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GrapeChecker UI
// ─────────────────────────────────────────────────────────────────────────────
function GrapeChecker() {
  const { grapeTotal, grapeFilled, grapeBpmIncrement, bpm, grape } = usePractice();
  const pct = grapeTotal > 0 ? Math.round((grapeFilled / grapeTotal) * 100) : 0;

  return (
    <UtilCard icon="🍇" title="포도송이 체크">
      {/* 헤더 정보 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[var(--ivps-text3)]">
          <span className="text-[var(--ivps-text1)] font-mono">{grapeFilled}</span>
          <span className="text-[var(--ivps-text4)]"> / {grapeTotal}</span>
          <span className="ml-1">세트 완료</span>
        </span>
        <span className="font-mono text-[11px] text-[var(--ivps-text3)]">{pct}%</span>
      </div>

      {/* 진행 바 */}
      <div className="h-[3px] bg-[var(--ivps-surface2)] rounded-full mb-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg,#9b7fc8,#7b5fa8)'
              : 'linear-gradient(90deg,#7ea890,#5a8872)',
          }}
        />
      </div>

      {/* BPM 증가 힌트 */}
      {grapeBpmIncrement > 0 && (
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9.5px] text-[var(--ivps-text4)] font-mono">
            체크당 +{grapeBpmIncrement} BPM
          </span>
          <span className="text-[9.5px] text-[var(--ivps-text4)] font-mono">
            현재 <span className="text-[var(--ivps-gold)]">{bpm}</span> BPM
          </span>
        </div>
      )}

      {/* 포도 알갱이 */}
      <div className="flex flex-wrap gap-1.5 justify-center mb-3 min-h-[54px]">
        {Array.from({ length: grapeTotal }, (_, i) => {
          const done = i < grapeFilled;
          return (
            <button
              key={i}
              onClick={() => grape.toggleGrape(i)}
              title={`${i + 1}번 세트`}
              className={[
                'w-[22px] h-[22px] rounded-full border flex items-center justify-center text-[9px] transition-all duration-150',
                done
                  ? 'bg-gradient-to-br from-[#9b7fc8] to-[#7b5fa8] border-[#9b7fc8] text-white scale-105'
                  : 'bg-[var(--ivps-surface2)] border-[var(--ivps-border2)] text-transparent hover:border-[#4a5568]',
              ].join(' ')}
            >
              {done ? '✓' : ''}
            </button>
          );
        })}
      </div>

      {/* 컨트롤 */}
      <div className="flex gap-1.5">
        <button
          onClick={grape.resetGrapes}
          className="flex-1 py-1.5 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-md text-[var(--ivps-text3)] text-[11px] hover:bg-[#222b3d] hover:text-[var(--ivps-text2)] transition-colors"
        >
          초기화
        </button>
        <button
          onClick={() => grape.adjustGrapeTotal(-1)}
          className="w-7 h-7 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-md text-[var(--ivps-text3)] text-sm flex items-center justify-center hover:bg-[#222b3d] transition-colors"
        >
          −
        </button>
        <button
          onClick={() => grape.adjustGrapeTotal(1)}
          className="w-7 h-7 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-md text-[var(--ivps-text3)] text-sm flex items-center justify-center hover:bg-[#222b3d] transition-colors"
        >
          +
        </button>
      </div>
    </UtilCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RightUtilPanel 최상위
// ─────────────────────────────────────────────────────────────────────────────
export function RightUtilPanel() {
  return (
    <aside className="w-[230px] flex-shrink-0 bg-[var(--ivps-nav)] border-l border-[var(--ivps-border)] flex flex-col overflow-hidden">
      <div className="px-3.5 pt-3.5 pb-2 flex-shrink-0">
        <div className="text-[9px] text-[#2a3045] uppercase tracking-[.1em] font-mono">
          유틸리티
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3.5 pb-3.5">
        <Metronome />
        <Tuner />
        <GrapeChecker />
      </div>
    </aside>
  );
}
