// src/components/phases/PracticeHUD.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — DURING
// 실제 연습 중 집중해야 할 HUD 체크포인트 표시.
// 활성 세션이 있을 때는 그 세션의 스킬 기준, 없으면 activeSkill 기준.
// 어댑티브 팁 + 연속 성공 카운터.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomyData';

// ── HUD 아이템 ─────────────────────────────────────────────────────────────
function HudItem({ index, text, isFirst, checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={[
        'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150',
        'border',
        checked
          ? 'border-[rgba(155,127,200,.4)] bg-[rgba(155,127,200,.12)]'
          : isFirst
          ? 'border-[rgba(155,127,200,.2)] bg-[rgba(155,127,200,.07)]'
          : 'border-[var(--ivps-border)] bg-[var(--ivps-surface)] hover:border-[rgba(155,127,200,.2)] hover:bg-[rgba(155,127,200,.05)]',
      ].join(' ')}
    >
      {/* 번호 / 체크 */}
      <span
        className={[
          'w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-medium flex-shrink-0 transition-all',
          checked
            ? 'bg-[#9b7fc8] text-white'
            : isFirst
            ? 'bg-[rgba(155,127,200,.22)] text-[var(--ivps-plum)]'
            : 'bg-[var(--ivps-surface2)] text-[var(--ivps-text3)]',
        ].join(' ')}
      >
        {checked ? '✓' : index + 1}
      </span>

      <span
        className={[
          'text-[14px] leading-tight flex-1',
          isFirst
            ? 'font-semibold text-[var(--ivps-text1)]'
            : 'font-medium text-[#c8d0dc]',
          checked ? 'line-through opacity-50' : '',
        ].join(' ')}
      >
        {text}
      </span>

      {/* 핵심 배지 */}
      {isFirst && !checked && (
        <span className="text-[9.5px] font-mono text-[var(--ivps-plum)] bg-[rgba(155,127,200,.15)] border border-[rgba(155,127,200,.25)] px-1.5 py-0.5 rounded flex-shrink-0">
          핵심
        </span>
      )}
    </button>
  );
}

// ── 어댑티브 팁 배너 ──────────────────────────────────────────────────────
function AdaptiveTip({ streak, bpm }) {
  if (streak < 3) return null;

  const messages = [
    streak >= 5
      ? `🔥 ${streak}회 연속 성공! 메트로놈 +5 BPM 고려해보세요 (현재 ${bpm})`
      : `⚡ ${streak}회 연속 성공 중 — 집중력 유지!`,
  ];

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[rgba(212,168,67,.2)] bg-[rgba(212,168,67,.06)] mb-3">
      <span className="text-[12px] text-[var(--ivps-gold)]">{messages[0]}</span>
      <span className="text-[var(--ivps-gold)] text-[12px]">›</span>
    </div>
  );
}

// ── PracticeHUD (메인) ────────────────────────────────────────────────────
export function PracticeHUD() {
  const { activeSkill, activeSession, bpm, nav } = usePractice();

  // 세션에 할당된 첫 번째 스킬 우선, 없으면 activeSkill
  const sessionSkill = activeSession?.skills?.length
    ? getSkillById(activeSession.skills[0])
    : null;
  const skill = sessionSkill ?? activeSkill;

  const [checkedItems, setCheckedItems] = useState(new Set());
  const [streak, setStreak] = useState(0);
  const catMeta = skill ? getCategoryMeta(skill.id) : null;

  const toggleItem = useCallback((index) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  const resetChecks = useCallback(() => {
    setCheckedItems(new Set());
  }, []);

  const handleStreakUp = useCallback(() => {
    setStreak(s => s + 1);
    resetChecks();
  }, [resetChecks]);

  const allChecked = skill && checkedItems.size >= skill.during.length;

  // ── 스킬 없음 ──────────────────────────────────────────────────────
  if (!skill) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="text-[38px] opacity-20">🎻</div>
        <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
          Before 탭에서 스킬을 선택하거나<br />악보 위 세션에 스킬을 할당하세요.
        </div>
        <button
          onClick={() => nav.setPhase('before')}
          className="px-4 py-2 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-lg text-[var(--ivps-text2)] text-[12px] hover:bg-[#222b3d] transition-colors"
        >
          ← Before 탭으로
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 헤더 — 스킬 정보 + 세션 컨텍스트 */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: `${catMeta?.color}18`, color: catMeta?.color }}
            >
              {skill.id}
            </span>
            <span className="font-serif text-[16px] font-semibold text-[var(--ivps-text1)]">
              {skill.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {streak > 0 && (
              <span className="font-mono text-[10px] text-[var(--ivps-gold)] bg-[rgba(212,168,67,.1)] border border-[rgba(212,168,67,.2)] px-1.5 py-0.5 rounded">
                🔥 ×{streak}
              </span>
            )}
            <button
              onClick={resetChecks}
              className="text-[10px] text-[var(--ivps-text4)] hover:text-[var(--ivps-text3)] font-mono transition-colors"
            >
              리셋
            </button>
          </div>
        </div>
        {/* 세션 컨텍스트 안내 */}
        {sessionSkill && (
          <div className="text-[10.5px] text-[var(--ivps-text4)] mt-1">
            세션 연결됨 — 악보 구간 {activeSession?.skills?.length}개 스킬
          </div>
        )}
      </div>

      {/* HUD 라벨 */}
      <div className="px-5 mb-3 flex-shrink-0">
        <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.08em] font-semibold flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9b7fc8]" />
          HUD · 찰나의 체크포인트
          <span className="ml-auto font-mono text-[var(--ivps-plum)]">
            {checkedItems.size}/{skill.during.length}
          </span>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-5 pb-3">

        {/* 어댑티브 팁 */}
        <AdaptiveTip streak={streak} bpm={bpm} />

        {/* HUD 체크포인트 목록 */}
        <div className="flex flex-col gap-2 mb-4">
          {skill.during.map((item, i) => (
            <HudItem
              key={i}
              index={i}
              text={item}
              isFirst={i === 0}
              checked={checkedItems.has(i)}
              onToggle={() => toggleItem(i)}
            />
          ))}
        </div>

        {/* 연속 성공 체크 영역 */}
        <div
          className={[
            'rounded-xl p-4 border transition-all duration-300',
            allChecked
              ? 'bg-[rgba(126,168,144,.1)] border-[rgba(126,168,144,.3)]'
              : 'bg-[var(--ivps-surface)] border-[var(--ivps-border)]',
          ].join(' ')}
        >
          <div className="text-[10.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold mb-3">
            연습 회차 완료
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['완벽했음', '보통', '어려웠음'].map((label, i) => {
              const colors = ['#7ea890', '#d4a843', '#e07070'];
              const col = colors[i];
              return (
                <button
                  key={label}
                  onClick={() => {
                    if (i === 0) handleStreakUp();
                    else setStreak(0);
                    resetChecks();
                  }}
                  className="py-2.5 rounded-lg text-[11.5px] font-medium border transition-all hover:scale-[1.02]"
                  style={{
                    background: `${col}12`,
                    borderColor: `${col}30`,
                    color: col,
                  }}
                >
                  {i === 0 ? '🎯' : i === 1 ? '😐' : '😣'} {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 세션에 여러 스킬이 있을 때 목록 */}
        {activeSession?.skills?.length > 1 && (
          <div className="mt-4">
            <div className="text-[10px] text-[var(--ivps-text4)] uppercase tracking-[.08em] font-mono mb-2">
              이 세션의 다른 스킬
            </div>
            <div className="flex flex-col gap-1.5">
              {activeSession.skills.slice(1).map(id => {
                const sk = getSkillById(id);
                if (!sk) return null;
                const meta = getCategoryMeta(id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--ivps-bg)] border border-[var(--ivps-border)]"
                  >
                    <span
                      className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      {sk.id}
                    </span>
                    <span className="text-[12px] text-[var(--ivps-text2)]">{sk.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 하단 CTA */}
      <div className="px-5 pb-5 flex-shrink-0">
        <button
          onClick={() => nav.setPhase('after')}
          className="w-full py-3 rounded-xl text-[#0d1117] font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#9b7fc8,#7b5fa8)' }}
        >
          연습 완료 — 진단하기 ›
        </button>
      </div>
    </div>
  );
}
