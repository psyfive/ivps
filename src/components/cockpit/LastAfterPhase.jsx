// src/components/cockpit/LastAfterPhase.jsx
import { useState, useEffect, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta, getSkillDisplayName } from '../../data/taxonomy';
import { DifficultyMarker } from '../phases/DiagnosticInterface';
import { requestNativeFullscreen } from '../../utils/nativeFullscreen';

function DiagCell({ label, color, value }) {
  return (
    <div className="bg-[var(--ivps-surface2)] rounded-lg p-3 border border-[var(--ivps-border)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="inline-block w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[9.5px] uppercase tracking-[.07em] font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="text-[12px] text-[var(--ivps-text1)] leading-relaxed">{value}</div>
    </div>
  );
}

function SkillReviewPanel({ skill }) {
  const [activeDiagIdx, setActiveDiagIdx] = useState(0);
  const catMeta = getCategoryMeta(skill.id);
  const displayName = getSkillDisplayName(skill);
  const afterArr = Array.isArray(skill.after) ? skill.after : [skill.after];
  const activeDiag = afterArr[activeDiagIdx] ?? afterArr[0];

  useEffect(() => {
    setActiveDiagIdx(0);
  }, [skill.id]);

  return (
    <div className="rounded-xl border border-[var(--ivps-border)] bg-[var(--ivps-surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--ivps-border)] flex items-center gap-2">
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: `${catMeta.color}18`, color: catMeta.color }}
        >
          {skill.id}
        </span>
        <span className="font-serif text-[14px] font-semibold text-[var(--ivps-text1)]">
          {displayName}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {afterArr.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {afterArr.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveDiagIdx(i)}
                className={[
                  'px-2.5 py-1 rounded-full border text-[10.5px] transition-colors',
                  activeDiagIdx === i
                    ? 'bg-[rgba(224,112,112,.12)] border-[rgba(224,112,112,.3)] text-[var(--ivps-rust)]'
                    : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
                ].join(' ')}
              >
                Case {i + 1}
              </button>
            ))}
          </div>
        )}

        {activeDiag && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(224,112,112,.2)' }}>
            <div
              className="px-3 py-2 border-b text-[10.5px] font-semibold"
              style={{
                background: 'rgba(224,112,112,.06)',
                borderColor: 'rgba(224,112,112,.15)',
                color: '#e07070',
              }}
            >
              {'\uC9C4\uB2E8 \uD3EC\uC778\uD2B8'}
            </div>
            <div className="grid grid-cols-3 gap-2 p-2.5">
              <DiagCell label={'\uC99D\uC0C1'} color="#e07070" value={activeDiag.symptom} />
              <DiagCell label={'\uC6D0\uC778'} color="#d4a843" value={activeDiag.cause} />
              <DiagCell label={'\uCC98\uBC29'} color="#7ea890" value={activeDiag.prescription} />
            </div>
          </div>
        )}

        {activeDiag?.prescription && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.15)]">
            <span className="text-[14px] flex-shrink-0">!</span>
            <div>
              <div className="text-[10px] text-[var(--ivps-gold)] font-semibold uppercase tracking-wide mb-1">
                {'\uCC98\uBC29 \uD3EC\uCEE4\uC2A4'}
              </div>
              <div className="text-[12px] text-[var(--ivps-gold)] leading-relaxed">
                {activeDiag.prescription}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LastAfterPhase() {
  const {
    activeScore,
    reviewSegmentIndex,
    nav,
    segment: segmentActs,
  } = usePractice();

  const segments = activeScore?.segments ?? [];
  const total = segments.length;
  const safeIdx = total > 0 ? Math.min(Math.max(0, reviewSegmentIndex), total - 1) : 0;
  const currentSegment = segments[safeIdx] ?? null;

  const hasPrev = safeIdx > 0;
  const hasNext = safeIdx < total - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) nav.setReviewIndex(safeIdx - 1);
  }, [hasPrev, safeIdx, nav]);

  const goNext = useCallback(() => {
    if (hasNext) nav.setReviewIndex(safeIdx + 1);
  }, [hasNext, safeIdx, nav]);

  const returnToDuring = useCallback(() => {
    nav.setPhase('during');
    requestNativeFullscreen();
  }, [nav]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') nav.exitLastAfter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, nav]);

  const segmentSkills = (currentSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-[var(--ivps-bg)] overflow-hidden">
      <div
        className="flex-shrink-0 flex items-center gap-3 px-5 border-b border-[var(--ivps-border)] bg-[var(--ivps-nav)]"
        style={{ height: 52 }}
      >
        <button
          onClick={nav.exitLastAfter}
          className="text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] text-[12px] flex items-center gap-1 px-2 py-1 rounded transition-colors flex-shrink-0"
        >
          {'\u2039 \uB300\uC2DC\uBCF4\uB4DC'}
        </button>
        <button
          onClick={returnToDuring}
          className="text-[#d4a843] bg-[rgba(212,168,67,.08)] border border-[rgba(212,168,67,.25)] hover:bg-[rgba(212,168,67,.14)] text-[12px] flex items-center gap-1 px-2.5 py-1 rounded transition-colors flex-shrink-0"
        >
          {'During\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30'}
        </button>
        <div className="w-px h-3.5 bg-[var(--ivps-surface2)] flex-shrink-0" />
        <span className="font-semibold text-[14px] text-[var(--ivps-text1)] truncate flex-1">
          {'\uC5F0\uC2B5 \uC885\uD569 \uB9AC\uBDF0'}{activeScore?.name ? ` · ${activeScore.name}` : ''}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            className="w-7 h-7 flex items-center justify-center rounded border text-[13px] transition-all"
            style={{
              borderColor: hasPrev ? 'rgba(155,127,200,.35)' : 'rgba(255,255,255,.08)',
              color: hasPrev ? '#9b7fc8' : 'rgba(255,255,255,.2)',
              background: hasPrev ? 'rgba(155,127,200,.08)' : 'transparent',
            }}
          >
            {'<'}
          </button>
          <span className="font-mono text-[12px] text-[var(--ivps-text2)] min-w-[72px] text-center">
            {total > 0 ? safeIdx + 1 : 0} / {total}
          </span>
          <button
            onClick={goNext}
            disabled={!hasNext}
            className="w-7 h-7 flex items-center justify-center rounded border text-[13px] transition-all"
            style={{
              borderColor: hasNext ? 'rgba(155,127,200,.35)' : 'rgba(255,255,255,.08)',
              color: hasNext ? '#9b7fc8' : 'rgba(255,255,255,.2)',
              background: hasNext ? 'rgba(155,127,200,.08)' : 'transparent',
            }}
          >
            {'>'}
          </button>
        </div>
      </div>

      {total > 1 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2 border-b border-[var(--ivps-border)]">
          {segments.map((seg, i) => (
            <button
              key={seg.id}
              onClick={() => nav.setReviewIndex(i)}
              className="rounded-full transition-all"
              style={{
                width: i === safeIdx ? 20 : 6,
                height: 6,
                background: i === safeIdx
                  ? '#9b7fc8'
                  : seg.difficulty === 'hard'
                    ? 'rgba(224,112,112,0.6)'
                    : 'rgba(255,255,255,.15)',
              }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="text-[38px] opacity-20">-</div>
            <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
              {'\uC774 \uC545\uBCF4\uC5D0\uB294 \uC124\uC815\uB41C \uAD6C\uAC04\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
              <br />
              <span className="text-[11px] text-[var(--ivps-text4)]">
                {'Before \uB2E8\uACC4\uC5D0\uC11C \uAD6C\uAC04\uC744 \uBA3C\uC800 \uC124\uC815\uD558\uC138\uC694.'}
              </span>
            </div>
            <button
              onClick={nav.exitLastAfter}
              className="px-4 py-2 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-lg text-[var(--ivps-text2)] text-[12px] hover:bg-[#222b3d] transition-colors"
            >
              {'\uB300\uC2DC\uBCF4\uB4DC\uB85C \uB3CC\uC544\uAC00\uAE30'}
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="flex items-start justify-between mb-5 gap-4">
              <div>
                <div className="text-[10.5px] text-[var(--ivps-text4)] uppercase tracking-[.07em] font-semibold mb-2">
                  {safeIdx + 1}{'\uAD6C\uAC04 \uC790\uAC00 \uD3C9\uAC00'}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {segmentSkills.length === 0 ? (
                    <span className="text-[11px] text-[var(--ivps-text4)]">{'\uC2A4\uD0AC \uBBF8\uB9E4\uD551'}</span>
                  ) : segmentSkills.map(sk => {
                    const meta = getCategoryMeta(sk.id);
                    return (
                      <span
                        key={sk.id}
                        className="px-2 py-0.5 rounded-full text-[10.5px] border"
                        style={{ background: `${meta.color}10`, borderColor: `${meta.color}25`, color: meta.color }}
                      >
                        {sk.id} {sk.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <div className="bg-[var(--ivps-surface)] rounded-lg px-3 py-2 border border-[var(--ivps-border)] text-center min-w-[56px]">
                  <div className="text-[9px] text-[var(--ivps-text3)] uppercase tracking-wide mb-1">
                    {'\uC2A4\uD0AC'}
                  </div>
                  <div className="font-mono text-[16px] font-semibold" style={{ color: '#d4a843' }}>
                    {currentSegment?.mappedSkills?.length ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {segmentSkills.length === 0 ? (
              <div className="text-center py-12 text-[12px] text-[var(--ivps-text4)] border border-dashed border-[var(--ivps-border)] rounded-xl">
                {'\uC774 \uAD6C\uAC04\uC5D0 \uB9E4\uD551\uB41C \uC2A4\uD0AC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
                <br />
                <span className="text-[11px]">{'Before \uB2E8\uACC4\uC5D0\uC11C \uC2A4\uD0AC\uC744 \uB9E4\uD551\uD558\uC138\uC694.'}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {segmentSkills.map(sk => (
                  <SkillReviewPanel key={sk.id} skill={sk} />
                ))}
              </div>
            )}

            {currentSegment && (
              <div className="mt-2">
                {currentSegment.difficulty === 'hard' ? (
                  <DifficultyMarker segment={currentSegment} segmentActs={segmentActs} />
                ) : (
                  <button
                    onClick={() => segmentActs.setSegmentDifficulty(currentSegment.id, 'hard')}
                    className="w-full py-2.5 rounded-xl border text-[11.5px] font-medium transition-all hover:scale-[1.01]"
                    style={{
                      background: 'rgba(224,112,112,0.06)',
                      borderColor: 'rgba(224,112,112,0.2)',
                      color: '#e07070',
                    }}
                  >
                    {'\uC5B4\uB824\uC6B4 \uAD6C\uAC04\uC73C\uB85C \uD45C\uC2DC\uD558\uAE30'}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--ivps-border)]">
              <button
                onClick={goPrev}
                disabled={!hasPrev}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-[12px] font-medium transition-all"
                style={{
                  borderColor: hasPrev ? 'rgba(155,127,200,.3)' : 'rgba(255,255,255,.08)',
                  color: hasPrev ? '#9b7fc8' : 'rgba(255,255,255,.2)',
                  background: hasPrev ? 'rgba(155,127,200,.06)' : 'transparent',
                  cursor: hasPrev ? 'pointer' : 'default',
                }}
              >
                {'\uC774\uC804 \uAD6C\uAC04'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={returnToDuring}
                  className="px-4 py-2.5 rounded-lg border text-[12px] font-medium transition-all"
                  style={{
                    borderColor: 'rgba(212,168,67,.3)',
                    color: '#d4a843',
                    background: 'rgba(212,168,67,.08)',
                  }}
                >
                  {'During\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30'}
                </button>
                <button
                  onClick={nav.exitLastAfter}
                  className="px-4 py-2.5 rounded-lg border text-[12px] font-medium transition-all"
                  style={{
                    borderColor: 'rgba(126,168,144,.3)',
                    color: '#7ea890',
                    background: 'rgba(126,168,144,.06)',
                  }}
                >
                  {'\uB300\uC2DC\uBCF4\uB4DC\uB85C'}
                </button>
              </div>

              <button
                onClick={goNext}
                disabled={!hasNext}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-[12px] font-medium transition-all"
                style={{
                  borderColor: hasNext ? 'rgba(155,127,200,.3)' : 'rgba(255,255,255,.08)',
                  color: hasNext ? '#9b7fc8' : 'rgba(255,255,255,.2)',
                  background: hasNext ? 'rgba(155,127,200,.06)' : 'transparent',
                  cursor: hasNext ? 'pointer' : 'default',
                }}
              >
                {'\uB2E4\uC74C \uAD6C\uAC04'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
