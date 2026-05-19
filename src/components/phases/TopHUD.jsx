// src/components/phases/TopHUD.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomy';
import { FOCUS_CATEGORY_META, getFocusItems, pickRandomFocusIndexes } from '../../utils/duringFocusItems';

const AUTO_INTERVAL_MS = 22_000;

function Btn({ onClick, children, active, title, disabled }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'flex min-h-7 items-center justify-center rounded-md border px-2 text-[11px] font-semibold transition-all select-none flex-shrink-0',
        active
          ? 'ivps-hud-btn ivps-hud-btn-accent'
          : 'ivps-hud-btn',
        disabled ? 'opacity-30 cursor-not-allowed' : '',
      ].join(' ')}
      style={{ minWidth: 28 }}
    >
      {children}
    </button>
  );
}

export function TopHUD() {
  const {
    phase,
    activeScore,
    selectedSegmentId,
    selectedSegment,
    duringChecklistMode,
  } = usePractice();

  const [skillIdx, setSkillIdx] = useState(0);
  const [autoMode, setAutoMode] = useState(false);
  const [focusByKey, setFocusByKey] = useState({});
  const autoTimerRef = useRef(null);

  useEffect(() => { setSkillIdx(0); }, [selectedSegmentId]);

  const skills = (selectedSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  const multiSkill = skills.length > 1;

  const advanceSkill = useCallback(() => {
    setSkillIdx(prev => (prev + 1) % Math.max(skills.length, 1));
  }, [skills.length]);

  const clearAutoTimer = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const startAutoTimer = useCallback(() => {
    clearAutoTimer();
    autoTimerRef.current = setInterval(advanceSkill, AUTO_INTERVAL_MS);
  }, [advanceSkill]);

  useEffect(() => {
    if (autoMode && multiSkill) {
      startAutoTimer();
    } else {
      clearAutoTimer();
    }
    return clearAutoTimer;
  }, [autoMode, multiSkill, startAutoTimer]);

  const goSkill = useCallback((idx) => {
    setSkillIdx(idx);
    if (autoMode && multiSkill) startAutoTimer();
  }, [autoMode, multiSkill, startAutoTimer]);

  const skill = skills[skillIdx] ?? null;
  const catMeta = skill ? getCategoryMeta(skill.id) : null;
  const color = catMeta?.color ?? '#9b7fc8';
  const items = skill?.during ?? [];
  const focusKey = selectedSegmentId && skill ? `${selectedSegmentId}:${skill.id}` : null;
  const focusItems = getFocusItems(items, focusKey ? focusByKey[focusKey] : null);
  const canReroll = items.length > 3;

  const segments = activeScore?.segments ?? [];
  const segNumber = segments.findIndex(s => s.id === selectedSegmentId) + 1;

  const rerollFocus = useCallback(() => {
    if (!focusKey || items.length <= 3) return;
    setFocusByKey(prev => ({
      ...prev,
      [focusKey]: pickRandomFocusIndexes(items, prev[focusKey]),
    }));
  }, [focusKey, items]);

  if (phase !== 'during' || duringChecklistMode !== 'top') return null;

  if (!selectedSegmentId || !selectedSegment) {
    return (
      <div
        className="ivps-hud-bar flex-shrink-0 flex items-center justify-center px-4"
        style={{
          minHeight: 48,
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
        }}
      >
        <span className="font-mono text-[11px] text-[rgba(255,255,255,.25)]">
          {'\uC545\uBCF4 \uC704 \uAD6C\uAC04 \uBC15\uC2A4\uB97C \uD0ED\uD558\uC5EC \uC5F0\uC2B5 \uBAA9\uD45C\uB97C \uB85C\uB4DC\uD558\uC138\uC694'}
        </span>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div
        className="ivps-hud-bar flex-shrink-0 flex flex-wrap items-center gap-3 px-4 py-2"
        style={{
          minHeight: 48,
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
        }}
      >
        <span
          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
          style={{ background: 'rgba(155,127,200,.15)', color: '#9b7fc8' }}
        >
          {segNumber > 0 ? `${segNumber}\uAD6C\uAC04` : '\uAD6C\uAC04'}
        </span>
        <span className="text-[11px] text-[rgba(255,255,255,.3)]">
          {'\uC774 \uAD6C\uAC04\uC5D0 \uB9E4\uD551\uB41C \uC2A4\uD0AC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. Before \uB2E8\uACC4\uC5D0\uC11C \uC2A4\uD0AC\uC744 \uCD94\uAC00\uD558\uC138\uC694.'}
        </span>
      </div>
    );
  }

  return (
    <div
      className="ivps-hud-bar flex-shrink-0 flex flex-wrap items-stretch gap-0 px-0"
      style={{
        minHeight: 76,
        borderLeft: 0,
        borderRight: 0,
        borderTop: 0,
      }}
    >
      <div
        className="flex flex-col justify-center gap-1 px-4 py-2 flex-shrink-0"
        style={{
          minWidth: 100,
          maxWidth: 120,
          borderRight: '1px solid var(--ivps-hud-border)',
        }}
      >
        <span
          className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded self-start leading-none"
          style={{ background: `${color}1a`, color }}
        >
          {segNumber > 0 ? `${segNumber}\uAD6C\uAC04` : '\uAD6C\uAC04'}
        </span>

        <div className="flex flex-col gap-[2px]">
          <span
            className="font-mono text-[9px] leading-none"
            style={{ color: `${color}99` }}
          >
            {skill.id}
          </span>
          <span
            className="text-[11.5px] font-semibold leading-tight"
            style={{ color: 'var(--ivps-hud-text)', maxWidth: 112, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {skill.name}
          </span>
        </div>
      </div>

      <div className="flex min-w-[260px] flex-1 flex-col justify-center gap-[6px] px-4 py-2">
        {focusItems.map(({ index, text, category }, i) => {
          const focusMeta = FOCUS_CATEGORY_META[category] ?? FOCUS_CATEGORY_META.general;
          return (
            <div
              key={index}
              className="flex items-center gap-2 text-left w-full rounded-md px-2 py-1"
              style={{
                background: focusMeta.bg,
                borderLeft: `3px solid ${focusMeta.color}`,
              }}
            >
              <span
                className={[
                  'min-w-0 whitespace-normal break-words text-[12px] leading-snug',
                  i === 0 ? 'font-semibold text-[rgba(255,255,255,.9)]' : 'text-[rgba(255,255,255,.68)]',
                ].join(' ')}
              >
                {text}
              </span>
            </div>
          );
        })}
      </div>

      {(multiSkill || canReroll) && (
        <div
          className="flex flex-col justify-center items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ borderLeft: '1px solid var(--ivps-hud-border)', minWidth: 80 }}
        >
          {multiSkill && (
            <div className="flex items-center gap-1">
              <Btn onClick={() => goSkill((skillIdx - 1 + skills.length) % skills.length)} title="Previous skill">
                {'<'}
              </Btn>
              <span className="font-mono text-[10px] text-[rgba(255,255,255,.3)] w-8 text-center select-none">
                {skillIdx + 1}/{skills.length}
              </span>
              <Btn onClick={() => goSkill((skillIdx + 1) % skills.length)} title="Next skill">
                {'>'}
              </Btn>
            </div>
          )}

          {canReroll && (
            <Btn onClick={rerollFocus} title="Reroll focus">
              ROLL
            </Btn>
          )}

          {multiSkill && (
            <Btn
              onClick={() => setAutoMode(m => !m)}
              active={autoMode}
              title={autoMode ? `AUTO off - rotates every ${AUTO_INTERVAL_MS / 1000}s` : 'AUTO mode'}
            >
              AUTO
            </Btn>
          )}

          {multiSkill && (
            <div className="flex gap-[5px] items-center">
              {skills.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goSkill(i)}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: i === skillIdx ? 10 : 5,
                    height: 5,
                    background: i === skillIdx ? color : 'rgba(255,255,255,.18)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
