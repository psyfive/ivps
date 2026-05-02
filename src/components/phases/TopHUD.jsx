// src/components/phases/TopHUD.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomy';
import { getFocusIndexes, pickRandomFocusIndexes } from '../../utils/duringFocusItems';

const AUTO_INTERVAL_MS = 22_000;

function Btn({ onClick, children, active, title, disabled }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'flex items-center justify-center rounded-md border text-[11px] font-semibold transition-all select-none flex-shrink-0',
        active
          ? 'bg-[rgba(155,127,200,.2)] border-[rgba(155,127,200,.45)] text-[#9b7fc8]'
          : 'bg-[rgba(255,255,255,.05)] border-[rgba(255,255,255,.1)] text-[rgba(255,255,255,.55)] hover:bg-[rgba(255,255,255,.1)] hover:text-white',
        disabled ? 'opacity-30 cursor-not-allowed' : '',
      ].join(' ')}
      style={{ height: 26, minWidth: 26, paddingLeft: 8, paddingRight: 8 }}
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
  const focusIndexes = getFocusIndexes(items.length, focusKey ? focusByKey[focusKey] : null);
  const focusItems = focusIndexes.map(index => ({ index, text: items[index] })).filter(item => item.text);
  const canReroll = items.length > 3;

  const segments = activeScore?.segments ?? [];
  const segNumber = segments.findIndex(s => s.id === selectedSegmentId) + 1;

  const rerollFocus = useCallback(() => {
    if (!focusKey || items.length <= 3) return;
    setFocusByKey(prev => ({
      ...prev,
      [focusKey]: pickRandomFocusIndexes(items.length, prev[focusKey]),
    }));
  }, [focusKey, items.length]);

  if (phase !== 'during' || duringChecklistMode !== 'top') return null;

  if (!selectedSegmentId || !selectedSegment) {
    return (
      <div
        className="flex-shrink-0 flex items-center justify-center px-4"
        style={{
          height: 48,
          background: 'rgba(13,17,23,0.88)',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          backdropFilter: 'blur(8px)',
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
        className="flex-shrink-0 flex items-center gap-3 px-4"
        style={{
          height: 48,
          background: 'rgba(13,17,23,0.88)',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          backdropFilter: 'blur(8px)',
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
      className="flex-shrink-0 flex items-stretch gap-0 px-0"
      style={{
        minHeight: 76,
        background: 'linear-gradient(180deg, rgba(10,14,20,0.97) 0%, rgba(13,17,23,0.88) 100%)',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="flex flex-col justify-center gap-1 px-4 py-2 flex-shrink-0"
        style={{
          minWidth: 100,
          maxWidth: 120,
          borderRight: '1px solid rgba(255,255,255,.07)',
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
            style={{ color: 'rgba(255,255,255,.88)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {skill.name}
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-[6px] px-4 py-2 flex-1 min-w-0">
        {focusItems.map(({ index, text }, i) => (
          <div key={index} className="flex items-center gap-2 text-left w-full">
            <span
              className="flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: i === 0 ? `${color}33` : 'rgba(255,255,255,.07)',
                color: i === 0 ? color : 'rgba(255,255,255,.42)',
                border: `1px solid ${i === 0 ? `${color}55` : 'rgba(255,255,255,.12)'}`,
              }}
            >
              {i + 1}
            </span>
            <span
              className={[
                'text-[11.5px] leading-snug',
                i === 0 ? 'font-semibold text-[rgba(255,255,255,.9)]' : 'text-[rgba(255,255,255,.68)]',
              ].join(' ')}
            >
              {text}
            </span>
          </div>
        ))}
      </div>

      {(multiSkill || canReroll) && (
        <div
          className="flex flex-col justify-center items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ borderLeft: '1px solid rgba(255,255,255,.07)', minWidth: 80 }}
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
