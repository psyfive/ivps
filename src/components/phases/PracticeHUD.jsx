// src/components/phases/PracticeHUD.jsx
import { useState, useCallback, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta, getSkillDisplayName } from '../../data/taxonomy';
import { requestNativeFullscreen } from '../../utils/nativeFullscreen';
import { FOCUS_CATEGORY_META, getFocusItems, pickRandomFocusIndexes } from '../../utils/duringFocusItems';

function FocusItem({ text, isFirst, category }) {
  const focusMeta = FOCUS_CATEGORY_META[category] ?? FOCUS_CATEGORY_META.general;
  return (
    <div
      className={[
        'w-full flex items-start gap-3 px-3.5 py-3 rounded-xl text-left border',
        isFirst
          ? 'border-[var(--ivps-plum-border)] bg-[var(--ivps-plum-bg)]'
          : 'border-[var(--ivps-border)] bg-[var(--ivps-surface)]',
      ].join(' ')}
      style={{
        background: focusMeta.bg,
        borderLeft: `3px solid ${focusMeta.color}`,
      }}
    >
      <span
        className={[
          'text-[13.5px] leading-snug flex-1',
          isFirst ? 'font-semibold text-[var(--ivps-text1)]' : 'font-medium text-[var(--ivps-text2)]',
        ].join(' ')}
      >
        {text}
      </span>
      {isFirst && (
        <span className="text-[9.5px] font-mono text-[var(--ivps-plum)] bg-[var(--ivps-plum-bg)] border border-[var(--ivps-plum-border)] px-1.5 py-0.5 rounded flex-shrink-0">
          FOCUS
        </span>
      )}
    </div>
  );
}

function AdaptiveTip({ streak, bpm }) {
  if (streak < 3) return null;
  const msg = streak >= 5
    ? `Streak ${streak}. Consider +5 BPM from ${bpm}.`
    : `Streak ${streak}. Keep the same focus one more pass.`;
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--ivps-gold-border)] bg-[var(--ivps-gold-bg)] mb-3">
      <span className="text-[12px] text-[var(--ivps-gold)] flex-1">{msg}</span>
    </div>
  );
}

function getSegmentMinPage(seg) {
  const pages = (seg.coordinates ?? []).map(c => c.pageIndex).filter(p => p != null);
  return pages.length > 0 ? Math.min(...pages) : (seg.pageIndex ?? 0);
}

function NoSegmentGuide({ onGoBefore }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="text-[36px] opacity-20">-</div>
      <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
        {'Before \uB2E8\uACC4\uC5D0\uC11C \uAD6C\uAC04\uC744 \uC124\uC815\uD558\uBA74'}
        <br />
        {'\uC774\uACF3\uC5D0\uC11C \uAD6C\uAC04\uBCC4 \uC5F0\uC2B5 \uD3EC\uCEE4\uC2A4\uB97C \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
      </div>
      <button
        onClick={onGoBefore}
        className="px-4 py-2 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-lg text-[var(--ivps-text2)] text-[12px] hover:bg-[#222b3d] transition-colors"
      >
        {'Before\uB85C'}
      </button>
    </div>
  );
}

function SelectSegmentGuide({ segments, selectedSegmentId, onSelect }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="text-[11px] text-[var(--ivps-text3)] uppercase tracking-[.08em] font-semibold mb-1">
          {'\uAD6C\uAC04 \uC120\uD0DD'}
        </div>
        <div className="text-[12px] text-[var(--ivps-text4)] leading-relaxed">
          {'\uC545\uBCF4\uC5D0\uC11C \uAD6C\uAC04\uC744 \uD074\uB9AD\uD558\uAC70\uB098 \uC544\uB798\uC5D0\uC11C \uC120\uD0DD\uD558\uC138\uC694.'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="flex flex-col gap-2">
          {segments.map((seg, idx) => {
            const isSelected = seg.id === selectedSegmentId;
            const skillCount = seg.mappedSkills.length;
            return (
              <button
                key={seg.id}
                onClick={() => onSelect(seg.id)}
                className={[
                  'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left border transition-all',
                  isSelected
                    ? 'bg-[var(--ivps-seg-practice-fill)] border-[var(--ivps-seg-practice)]'
                    : 'bg-[var(--ivps-surface)] border-[var(--ivps-border)] hover:border-[var(--ivps-plum-border)] hover:bg-[var(--ivps-plum-bg)]',
                ].join(' ')}
              >
                <span className="w-8 h-8 rounded-lg bg-[var(--ivps-plum-bg)] text-[var(--ivps-plum)] font-mono text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-[var(--ivps-text1)]">
                    {idx + 1}{'\uAD6C\uAC04'}
                  </div>
                  <div className="text-[10.5px] text-[var(--ivps-text4)] mt-0.5">
                    {skillCount > 0
                      ? seg.mappedSkills.map(id => {
                          const sk = getSkillById(id);
                          return sk ? `${sk.id} ${sk.name}` : id;
                        }).join(' · ')
                      : '\uC2A4\uD0AC \uBBF8\uB9E4\uD551'}
                  </div>
                </div>
                {skillCount > 0 && (
                  <span className="text-[10px] font-mono text-[var(--ivps-plum)] bg-[var(--ivps-plum-bg)] border border-[var(--ivps-plum-border)] px-1.5 py-0.5 rounded flex-shrink-0">
                    {skillCount}{'\uC2A4\uD0AC'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PracticeHUD({ onOpenAfterSheet }) {
  const { activeScore, activeSkill, selectedSegmentId, bpm, nav, ui, score: scoreActs, segment: segmentActs } = usePractice();

  const segments = activeScore?.segments ?? [];
  const selectedSegment = segments.find(s => s.id === selectedSegmentId) ?? null;

  const segmentSkills = (selectedSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  const [skillTabIdx, setSkillTabIdx] = useState(0);
  const [focusByKey, setFocusByKey] = useState({});
  const [streak, setStreak] = useState(0);

  useEffect(() => { setSkillTabIdx(0); }, [selectedSegmentId]);

  const skill = segmentSkills[skillTabIdx] ?? activeSkill ?? null;
  const catMeta = skill ? getCategoryMeta(skill.id) : null;
  const color = catMeta?.color ?? '#9b7fc8';
  const duringItems = skill?.during ?? [];
  const focusKey = selectedSegmentId && skill ? `${selectedSegmentId}:${skill.id}` : (skill ? `active:${skill.id}` : null);
  const focusItems = getFocusItems(duringItems, focusKey ? focusByKey[focusKey] : null);
  const canReroll = duringItems.length > 3;

  const selectSegment = useCallback((id) => {
    segmentActs.selectSegment(id);
    const seg = segments.find(s => s.id === id);
    if (!seg) return;
    const targetPage = getSegmentMinPage(seg);
    if (targetPage !== activeScore?.currentPageIndex) scoreActs.setPage(targetPage);
  }, [activeScore, scoreActs, segmentActs, segments]);

  const rerollFocus = useCallback(() => {
    if (!focusKey || duringItems.length <= 3) return;
    setFocusByKey(prev => ({
      ...prev,
      [focusKey]: pickRandomFocusIndexes(duringItems, prev[focusKey]),
    }));
  }, [focusKey, duringItems]);

  const FullscreenBtn = () => (
    <button
      onClick={() => { ui.setPracticeFullscreen(true); requestNativeFullscreen(); }}
      className="mx-5 mt-3 mb-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[11px] font-semibold transition-all flex-shrink-0 bg-[var(--ivps-plum-bg)] border-[var(--ivps-plum-border)] text-[var(--ivps-plum)] hover:bg-[var(--ivps-seg-practice-fill)]"
    >
      {'\uC545\uBCF4 \uC804\uCCB4\uD654\uBA74'}
    </button>
  );

  if (segments.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FullscreenBtn />
        <NoSegmentGuide onGoBefore={() => nav.setPhase('before')} />
      </div>
    );
  }

  if (!selectedSegment) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FullscreenBtn />
        <SelectSegmentGuide
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelect={selectSegment}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FullscreenBtn />

      <div className="px-5 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {segments.map((seg, idx) => (
            <button
              key={seg.id}
              onClick={() => selectSegment(seg.id)}
              className={[
                'px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all',
                seg.id === selectedSegmentId
                  ? 'bg-[var(--ivps-seg-selected-fill)] border-[var(--ivps-seg-selected)] text-[var(--ivps-gold)]'
                  : seg.difficulty === 'hard'
                    ? 'bg-[var(--ivps-seg-hard-fill)] border-[var(--ivps-seg-hard)] text-[var(--ivps-rust)] hover:opacity-80'
                    : (seg.mappedSkills ?? []).length > 0
                      ? 'bg-[var(--ivps-seg-mapped-fill)] border-[var(--ivps-seg-mapped)] text-[var(--ivps-moss)] hover:opacity-80'
                      : 'bg-[var(--ivps-seg-unmapped-fill)] border-[var(--ivps-seg-unmapped)] text-[var(--ivps-plum)] hover:opacity-80',
              ].join(' ')}
            >
              {idx + 1}{'\uAD6C\uAC04'}
            </button>
          ))}
        </div>

        {segmentSkills.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {segmentSkills.map((sk, i) => {
              const meta = getCategoryMeta(sk.id);
              const isActive = i === skillTabIdx;
              return (
                <button
                  key={sk.id}
                  onClick={() => setSkillTabIdx(i)}
                  className={[
                    'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] border transition-all',
                    isActive
                      ? 'border-current'
                      : 'border-[var(--ivps-border)] text-[var(--ivps-text4)] hover:text-[var(--ivps-text3)]',
                  ].join(' ')}
                  style={isActive ? { background: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}50` } : {}}
                >
                  <span className="font-mono">{sk.id}</span>
                  <span className="hidden sm:inline text-[9.5px] opacity-70">{sk.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] text-[var(--ivps-text4)] italic">
            {'\uC774 \uAD6C\uAC04\uC5D0 \uB9E4\uD551\uB41C \uC2A4\uD0AC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
          </div>
        )}
      </div>

      {skill && (
        <div className="px-5 py-2 border-t border-b border-[var(--ivps-border)] flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: `${catMeta?.color}18`, color: catMeta?.color }}
            >
              {skill.id}
            </span>
            <span className="font-serif text-[14px] font-semibold text-[var(--ivps-text1)] truncate">
              {getSkillDisplayName(skill)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {streak > 0 && (
              <span className="font-mono text-[10px] text-[var(--ivps-gold)] bg-[rgba(212,168,67,.1)] border border-[rgba(212,168,67,.2)] px-1.5 py-0.5 rounded">
                x{streak}
              </span>
            )}
            {canReroll && (
              <button
                type="button"
                onClick={rerollFocus}
                className="text-[10px] text-[var(--ivps-gold)] bg-[var(--ivps-gold-bg)] border border-[var(--ivps-gold-border)] rounded px-2 py-1 hover:bg-[rgba(212,168,67,.14)] transition-colors"
              >
                ROLL
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-3">
        <AdaptiveTip streak={streak} bpm={bpm} />

        {duringItems.length > 0 && (
          <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.08em] font-semibold flex items-center gap-1.5 mb-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ivps-plum)]" />
            FOCUS
            <span className="ml-auto font-mono text-[var(--ivps-plum)]">
              {focusItems.length}/{duringItems.length}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          {focusItems.map(({ index, text, category }, i) => (
            <FocusItem
              key={index}
              text={text}
              isFirst={i === 0}
              category={category}
            />
          ))}
          {duringItems.length === 0 && segmentSkills.length > 0 && (
            <div className="text-[12px] text-[var(--ivps-text4)] text-center py-4">
              {'\uC120\uD0DD\uB41C \uC2A4\uD0AC\uC5D0 During \uD3EC\uCEE4\uC2A4 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'}
            </div>
          )}
        </div>

        <div className="rounded-xl p-4 border bg-[var(--ivps-surface)] border-[var(--ivps-border)]">
          <div className="text-[10.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold mb-3">
            {'\uC5F0\uC2B5 \uD750\uB984 \uAE30\uB85D'}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['success', '\uC131\uACF5', '#7ea890'],
              ['ok', '\uBCF4\uD1B5', '#d4a843'],
              ['hard', '\uC5B4\uB824\uC6C0', '#e07070'],
            ].map(([result, label, col]) => (
              <button
                key={result}
                onClick={() => {
                  if (result === 'success') setStreak(s => s + 1);
                  else setStreak(0);
                }}
                className="py-2.5 rounded-lg text-[11.5px] font-medium border transition-all hover:scale-[1.02]"
                style={{ background: `${col}12`, borderColor: `${col}30`, color: col }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 flex-shrink-0">
        <button
          onClick={() => onOpenAfterSheet ? onOpenAfterSheet() : nav.setPhase('after')}
          className="w-full py-3 rounded-xl text-[#0d1117] font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,var(--ivps-plum),var(--ivps-plum-dim))' }}
        >
          {'\uC5F0\uC2B5 \uC885\uB8CC - \uC9C4\uB2E8\uD558\uAE30'}
        </button>
      </div>
    </div>
  );
}
