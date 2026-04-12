// src/components/library/SkillDetailModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 스킬 상세 모달.
// 4차원 구조 (corePrinciple / before / during / after) 전체 표시.
// after 배열이 여러 개일 때 케이스 탭 전환.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { getCategoryMeta, SKILL_GROUPS, getXpPercent, getPrerequisites, getSynergies } from '../../data/taxonomy';

// ── PhaseBlock ─────────────────────────────────────────────────────────────
function PhaseBlock({ label, dotColor, children }) {
  return (
    <div
      className="rounded-[10px] p-4 mb-3.5 border"
      style={{ background: `${dotColor}07`, borderColor: `${dotColor}20` }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase tracking-[.07em] mb-3 flex items-center gap-1.5"
        style={{ color: dotColor }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
        />
        {label}
      </div>
      {children}
    </div>
  );
}

// ── DiagRow ────────────────────────────────────────────────────────────────
function DiagRow({ label, color, value }) {
  return (
    <div className="bg-[var(--ivps-bg)] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="w-[5px] h-[5px] rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <span
          className="text-[9.5px] uppercase tracking-[.07em] font-semibold"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      <p className="text-[12px] text-[var(--ivps-text1)] leading-relaxed">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkillDetailModal
// ─────────────────────────────────────────────────────────────────────────────
export function SkillDetailModal({ skill, onClose, onStartPractice }) {
  const [activeDiagIdx, setActiveDiagIdx] = useState(0);
  const meta    = getCategoryMeta(skill.id);
  const group   = SKILL_GROUPS.find(g => g.id === skill.groupId);
  const pct     = getXpPercent(skill);
  const afterArr = Array.isArray(skill.after) ? skill.after : [skill.after];

  // ESC 닫기
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = useCallback(e => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,.75)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="bg-[var(--ivps-surface)] rounded-[14px] w-full max-w-[580px] max-h-[88vh] flex flex-col border border-[var(--ivps-border2)] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >

        {/* ── 헤더 ── */}
        <div className="px-[26px] pt-[22px] pb-[18px] border-b border-[var(--ivps-border)] flex items-start justify-between sticky top-0 bg-[var(--ivps-surface)] z-10 rounded-t-[14px]">
          <div className="flex-1 min-w-0 pr-4">
            {/* ID + 그룹 */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                style={{ background: `${meta.color}18`, color: meta.color }}
              >
                {skill.id}
              </span>
              {group && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{ background: `${meta.color}10`, color: meta.color }}
                >
                  {group.name}
                </span>
              )}
            </div>
            {/* 스킬명 */}
            <h2 className="font-serif text-[24px] font-bold text-[var(--ivps-text1)] leading-tight">
              {skill.name}
            </h2>
            {/* XP 바 */}
            <div className="flex items-center gap-2.5 mt-2">
              <div className="h-[3px] flex-1 bg-[var(--ivps-surface2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg,${meta.color}88,${meta.color})`,
                  }}
                />
              </div>
              <span className="font-mono text-[10px] text-[var(--ivps-text4)] flex-shrink-0">
                {skill.xp}/{skill.maxXp} XP · Lv.{skill.level}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] hover:bg-[var(--ivps-surface2)] transition-colors text-lg leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── 본문 스크롤 ── */}
        <div className="flex-1 overflow-y-auto px-[26px] py-5">

          {/* 핵심 원리 */}
          <PhaseBlock label="핵심 원리" dotColor="#d4a843">
            <p className="text-[13px] text-[var(--ivps-text1)] leading-[1.75]">
              {skill.corePrinciple}
            </p>
          </PhaseBlock>

          {/* Before */}
          {skill.before && (
            <PhaseBlock label="Before — 이론 & 감각 가이드" dotColor="#7ea890">
              <p className="text-[12.5px] text-[#8a96a8] leading-[1.8]">
                {skill.before}
              </p>
            </PhaseBlock>
          )}

          {/* During */}
          <PhaseBlock label="During — 찰나의 체크포인트" dotColor="#9b7fc8">
            <div className="flex flex-col gap-2">
              {skill.during.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                  style={{
                    background: 'rgba(155,127,200,.07)',
                    border: '1px solid rgba(155,127,200,.12)',
                  }}
                >
                  <span
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center font-mono text-[11px] font-medium flex-shrink-0"
                    style={{ background: 'rgba(155,127,200,.18)', color: '#9b7fc8' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13px] text-[var(--ivps-text1)]">{item}</span>
                </div>
              ))}
            </div>
          </PhaseBlock>

          {/* After */}
          <PhaseBlock label="After — 증상·원인·처방" dotColor="#e07070">

            {/* 케이스 탭 (복수일 때만) */}
            {afterArr.length > 1 && (
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {afterArr.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDiagIdx(i)}
                    className={[
                      'px-2.5 py-1 rounded-full border text-[10.5px] transition-colors',
                      activeDiagIdx === i
                        ? 'bg-[rgba(224,112,112,.12)] border-[rgba(224,112,112,.35)] text-[var(--ivps-rust)]'
                        : 'bg-transparent border-[var(--ivps-border2)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
                    ].join(' ')}
                  >
                    케이스 {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* 진단 3열 */}
            {afterArr[activeDiagIdx] && (
              <div className="grid grid-cols-3 gap-2">
                <DiagRow label="증상" color="#e07070" value={afterArr[activeDiagIdx].symptom} />
                <DiagRow label="원인" color="#d4a843" value={afterArr[activeDiagIdx].cause} />
                <DiagRow label="처방" color="#7ea890" value={afterArr[activeDiagIdx].prescription} />
              </div>
            )}
          </PhaseBlock>

          {/* 스킬 연결망 섹션 */}
          {(() => {
            const prereqs = getPrerequisites(skill.id);
            const syners  = getSynergies(skill.id);
            if (prereqs.length === 0 && syners.length === 0) return null;

            return (
              <div
                className="rounded-[10px] p-4 mb-3.5 border"
                style={{ background: 'rgba(107,144,184,0.05)', borderColor: 'rgba(107,144,184,0.18)' }}
              >
                <div
                  className="text-[10.5px] font-semibold uppercase tracking-[.07em] mb-3 flex items-center gap-1.5"
                  style={{ color: '#6b90b8' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#6b90b8]" />
                  스킬 연결망
                </div>

                {prereqs.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[9.5px] text-[var(--ivps-text4)] uppercase tracking-[.06em] mb-2">
                      선행 스킬 — 먼저 익혀두면 좋아요
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {prereqs.map(sk => {
                        const m = getCategoryMeta(sk.id);
                        return (
                          <div
                            key={sk.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10.5px]"
                            style={{ background: `${m.color}0d`, borderColor: `${m.color}28`, color: m.color }}
                          >
                            <span className="font-mono text-[9.5px]">{sk.id}</span>
                            <span className="text-[var(--ivps-text2)]">{sk.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {syners.length > 0 && (
                  <div>
                    <div className="text-[9.5px] text-[var(--ivps-text4)] uppercase tracking-[.06em] mb-2">
                      시너지 스킬 — 함께 연습하면 효과적
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {syners.map(sk => {
                        const m = getCategoryMeta(sk.id);
                        return (
                          <div
                            key={sk.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10.5px]"
                            style={{ background: `${m.color}0d`, borderColor: `${m.color}35`, color: m.color }}
                          >
                            <span className="font-mono text-[9.5px]">{sk.id}</span>
                            <span className="text-[var(--ivps-text2)]">{sk.name}</span>
                            <span style={{ fontSize: 9, opacity: 0.6 }}>⟷</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>

        {/* ── 푸터 CTA ── */}
        <div className="px-[26px] pb-[22px] flex-shrink-0">
          <button
            onClick={() => onStartPractice(skill.id)}
            className="w-full py-[13px] bg-gradient-to-r from-[#d4a843] to-[#b8891f] rounded-[9px] text-[#0d1117] font-semibold text-[13.5px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            ▶ 이 스킬로 연습 시작
          </button>
        </div>

      </div>
    </div>
  );
}
