// src/components/phases/CognitiveBriefing.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — BEFORE
// 연습 전 인지 준비 단계. 핵심 원리 + 감각 가이드를 제공.
// 스킬이 선택되지 않았을 때는 "스킬 없음" 안내 화면 표시.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getCategoryMeta } from '../../data/taxonomyData';

// ── 헬퍼: 카테고리 색상 ────────────────────────────────────────────────────
function useCatColor(skill) {
  if (!skill) return { color: '#4a5568', bg: 'rgba(74,85,104,.08)' };
  const meta = getCategoryMeta(skill.id);
  return { color: meta.color, bg: meta.bg };
}

// ── 인라인 카드 ────────────────────────────────────────────────────────────
function BriefingCard({ accent, label, dotColor, children }) {
  return (
    <div
      className="rounded-[11px] p-4 mb-3 border"
      style={{
        background: `${dotColor}09`,
        borderColor: `${dotColor}22`,
      }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase tracking-[.07em] mb-3 flex items-center gap-1.5"
        style={{ color: dotColor }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
        />
        {label}
      </div>
      {children}
    </div>
  );
}

// ── 스킬 없음 안내 ────────────────────────────────────────────────────────
function NoSkillPrompt() {
  const { nav } = usePractice();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="text-[40px] opacity-20">🎛</div>
      <div className="text-[13px] text-[#4a5568] leading-relaxed">
        스킬 라이브러리에서<br />연습할 기술을 선택해주세요.
      </div>
      <button
        onClick={() => nav.navigate('library')}
        className="px-4 py-2 bg-[rgba(212,168,67,.08)] border border-[rgba(212,168,67,.3)] rounded-lg text-[#d4a843] text-[12.5px] hover:bg-[rgba(212,168,67,.14)] transition-colors"
      >
        스킬 라이브러리 가기
      </button>
    </div>
  );
}

// ── CognitiveBriefing (메인) ───────────────────────────────────────────────
export function CognitiveBriefing() {
  const { activeSkill, nav } = usePractice();
  const { color } = useCatColor(activeSkill);
  const [principleExpanded, setPrincipleExpanded] = useState(true);
  const [guideExpanded, setGuideExpanded] = useState(true);

  if (!activeSkill) return <NoSkillPrompt />;

  const s = activeSkill;
  const beforeText = typeof s.before === 'string' ? s.before : '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 스킬 헤더 */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className="font-mono text-[10.5px] mb-1 flex items-center gap-1.5"
              style={{ color }}
            >
              <span
                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: `${color}18`, color }}
              >
                {s.id}
              </span>
              <span className="text-[#4a5568]">{s.groupId}</span>
            </div>
            <h2 className="font-serif text-[22px] font-bold text-[#e8e2d6] leading-tight">
              {s.name}
            </h2>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-[10px] text-[#4a5568] mb-1">
              Lv.{s.level}
            </div>
            <div className="text-[10px] text-[#3d4455]">
              {s.xp}/{s.maxXp} XP
            </div>
            <div className="h-1 w-16 bg-[#1a2035] rounded-full mt-1 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((s.xp / s.maxXp) * 100)}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 스크롤 본문 */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">

        {/* 핵심 원리 */}
        <BriefingCard label="핵심 원리" dotColor="#d4a843">
          <p className="text-[13.5px] text-[#e8e2d6] leading-[1.75]">
            {s.corePrinciple}
          </p>
        </BriefingCard>

        {/* 연습 전 감각 가이드 */}
        {beforeText && (
          <BriefingCard label="연습 전 — 이론 & 감각 가이드" dotColor="#7ea890">
            <p className="text-[13px] text-[#8a96a8] leading-[1.8]">
              {beforeText}
            </p>
          </BriefingCard>
        )}

        {/* During 미리보기 (접을 수 있음) */}
        <div
          className="rounded-[11px] border border-[rgba(155,127,200,.15)] mb-3 overflow-hidden"
          style={{ background: 'rgba(155,127,200,.04)' }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setPrincipleExpanded(v => !v)}
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] flex items-center gap-1.5 text-[#9b7fc8]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9b7fc8] flex-shrink-0" />
              During 체크포인트 미리보기
            </div>
            <span className="text-[#4a5568] text-[12px] transition-transform duration-200"
              style={{ transform: principleExpanded ? 'rotate(180deg)' : 'none' }}>
              ▾
            </span>
          </button>
          {principleExpanded && (
            <div className="px-4 pb-4">
              <div className="flex flex-col gap-2">
                {s.during.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                    style={{ background: 'rgba(155,127,200,.07)', border: '1px solid rgba(155,127,200,.12)' }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-medium flex-shrink-0"
                      style={{ background: 'rgba(155,127,200,.18)', color: '#9b7fc8' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-[#e8e2d6]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* After 진단 미리보기 */}
        {Array.isArray(s.after) && s.after.length > 0 && (
          <div
            className="rounded-[11px] border border-[rgba(224,112,112,.15)] mb-3 overflow-hidden"
            style={{ background: 'rgba(224,112,112,.04)' }}
          >
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setGuideExpanded(v => !v)}
            >
              <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] flex items-center gap-1.5 text-[#e07070]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e07070] flex-shrink-0" />
                After 진단 케이스 ({s.after.length}개)
              </div>
              <span className="text-[#4a5568] text-[12px] transition-transform duration-200"
                style={{ transform: guideExpanded ? 'rotate(180deg)' : 'none' }}>
                ▾
              </span>
            </button>
            {guideExpanded && (
              <div className="px-4 pb-4">
                {s.after.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 py-2 border-b border-[rgba(224,112,112,.1)] last:border-0 last:pb-0"
                  >
                    <span className="font-mono text-[9.5px] text-[#e07070] mt-0.5 flex-shrink-0 w-12">
                      증상 {s.after.length > 1 ? i + 1 : ''}
                    </span>
                    <span className="text-[11.5px] text-[#6a7688] leading-relaxed">
                      {a.symptom}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 하단 CTA */}
      <div className="px-5 pb-5 flex-shrink-0">
        <button
          onClick={() => nav.setPhase('during')}
          className="w-full py-3 rounded-xl text-[#0d1117] font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: `linear-gradient(135deg,#7ea890,#5a8070)` }}
        >
          연습 시작 — During ›
        </button>
      </div>
    </div>
  );
}
