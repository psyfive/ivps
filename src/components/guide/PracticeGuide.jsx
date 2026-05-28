// src/components/guide/PracticeGuide.jsx
import { useState } from 'react';
import { GUIDE_SECTIONS, QUICK_ROUTINE } from '../../data/practiceGuideData';

// ── 키워드 하이라이트 렌더러 ────────────────────────────────────────────────
function HighlightText({ text, keywords = [] }) {
  if (!keywords.length) return <span>{text}</span>;

  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliestIdx = remaining.length;
    let matched = null;

    for (const kw of keywords) {
      const idx = remaining.indexOf(kw);
      if (idx !== -1 && idx < earliestIdx) {
        earliestIdx = idx;
        matched = kw;
      }
    }

    if (!matched) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    if (earliestIdx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, earliestIdx)}</span>);
    }
    parts.push(
      <mark
        key={key++}
        className="font-bold not-italic rounded-sm px-0.5"
        style={{ background: 'rgba(212,168,67,.18)', color: 'var(--ivps-gold)' }}
      >
        {matched}
      </mark>
    );
    remaining = remaining.slice(earliestIdx + matched.length);
  }

  return <>{parts}</>;
}

// ── 아코디언 아이템 ──────────────────────────────────────────────────────────
function AccordionItem({ item, isOpen, onToggle }) {
  return (
    <div className="border border-[var(--ivps-border)] rounded-xl overflow-hidden mb-2.5">
      {/* 헤더 */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[var(--ivps-surface)]"
        style={{ background: isOpen ? 'var(--ivps-surface)' : 'var(--ivps-nav)' }}
      >
        <span className="text-[13px] font-semibold text-[var(--ivps-text1)] pr-3 leading-snug">
          {item.subtitle}
        </span>
        <span
          className="flex-shrink-0 text-[var(--ivps-text4)] text-[11px] transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>

      {/* 본문 */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1" style={{ background: 'var(--ivps-nav)' }}>
          {/* 핵심 개념 */}
          <div
            className="text-[12px] leading-relaxed mb-3 px-3 py-2.5 rounded-lg border-l-2"
            style={{
              background: 'var(--ivps-surface)',
              borderColor: 'var(--ivps-gold)',
              color: 'var(--ivps-text2)',
            }}
          >
            <HighlightText text={item.coreConcept} keywords={item.keywords} />
          </div>

          {/* 세부 항목 */}
          <ul className="space-y-2">
            {item.details.map((detail, i) => (
              <li key={i} className="flex gap-2.5 text-[12px] text-[var(--ivps-text3)] leading-relaxed">
                <span className="flex-shrink-0 mt-[3px] text-[8px] text-[var(--ivps-text4)]">◆</span>
                <HighlightText text={detail} keywords={item.keywords} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── 탭 패널 (섹션 하나) ──────────────────────────────────────────────────────
function SectionPanel({ section }) {
  const [openId, setOpenId] = useState(null);

  const toggle = (idx) => setOpenId(prev => (prev === idx ? null : idx));

  return (
    <div>
      <p className="text-[12px] text-[var(--ivps-text4)] mb-4 leading-relaxed">
        {section.description}
      </p>
      {section.items.map((item, idx) => (
        <AccordionItem
          key={idx}
          item={item}
          isOpen={openId === idx}
          onToggle={() => toggle(idx)}
        />
      ))}
    </div>
  );
}

// ── 3분 퀵 루틴 ──────────────────────────────────────────────────────────────
function QuickRoutine() {
  const [checked, setChecked] = useState({});
  const [open, setOpen] = useState(false);
  const total = QUICK_ROUTINE.steps.length;
  const done = Object.values(checked).filter(Boolean).length;
  const allDone = done === total;

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  const reset = () => {
    setChecked({});
    setOpen(false);
  };

  return (
    <div
      className="rounded-xl border mb-6 overflow-hidden"
      style={{
        borderColor: allDone ? 'rgba(126,168,144,.6)' : 'var(--ivps-border2)',
        background: 'var(--ivps-nav)',
      }}
    >
      {/* 헤더 토글 */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--ivps-surface)]"
      >
        <span className="text-[18px]">⚡</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[var(--ivps-text1)] leading-tight">
            {QUICK_ROUTINE.title}
          </div>
          <div className="text-[10.5px] text-[var(--ivps-text4)] mt-0.5">
            {QUICK_ROUTINE.description}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 진행 칩 */}
          <span
            className="text-[10.5px] font-mono px-2 py-0.5 rounded-full"
            style={{
              background: allDone ? 'rgba(126,168,144,.18)' : 'var(--ivps-surface)',
              color: allDone ? '#7ea890' : 'var(--ivps-text4)',
            }}
          >
            {done}/{total}
          </span>
          <span
            className="text-[11px] text-[var(--ivps-text4)] transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* 체크리스트 */}
      {open && (
        <div className="px-4 pb-4 pt-0.5">
          <div className="space-y-2">
            {QUICK_ROUTINE.steps.map(step => {
              const isChecked = !!checked[step.id];
              return (
                <label
                  key={step.id}
                  className="flex items-start gap-3 cursor-pointer group rounded-lg px-3 py-2.5 transition-colors"
                  style={{
                    background: isChecked ? 'rgba(126,168,144,.08)' : 'var(--ivps-surface)',
                  }}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isChecked}
                    onChange={() => toggle(step.id)}
                  />
                  {/* 커스텀 체크박스 */}
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors mt-0.5"
                    style={{
                      borderColor: isChecked ? '#7ea890' : 'var(--ivps-border2)',
                      background: isChecked ? 'rgba(126,168,144,.22)' : 'transparent',
                    }}
                  >
                    {isChecked && (
                      <span className="text-[10px]" style={{ color: '#7ea890' }}>✓</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[13px]">{step.icon}</span>
                      <span
                        className="text-[12px] font-semibold transition-colors"
                        style={{ color: isChecked ? '#7ea890' : 'var(--ivps-text1)' }}
                      >
                        {step.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--ivps-text4)] leading-relaxed">
                      {step.instruction}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* 완료 배너 */}
          {allDone && (
            <div className="mt-3 px-3 py-2.5 rounded-lg text-center"
              style={{ background: 'rgba(126,168,144,.12)', color: '#7ea890' }}>
              <span className="text-[12px] font-semibold">
                준비 완료! 오늘의 연습을 시작하세요 🎻
              </span>
              <button
                type="button"
                onClick={reset}
                className="block mx-auto mt-1.5 text-[10px] opacity-60 hover:opacity-100 transition-opacity underline"
                style={{ color: '#7ea890' }}
              >
                초기화
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PracticeGuide 메인 ────────────────────────────────────────────────────────
export function PracticeGuide() {
  const [activeTab, setActiveTab] = useState(GUIDE_SECTIONS[0].id);
  const activeSection = GUIDE_SECTIONS.find(s => s.id === activeTab);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--ivps-bg)' }}>
      {/* 헤더 */}
      <div
        className="flex-shrink-0 px-6 pt-6 pb-4 border-b"
        style={{ borderColor: 'var(--ivps-border)' }}
      >
        <h1 className="font-serif text-[20px] font-bold text-[var(--ivps-text1)] tracking-wide">
          연습 가이드
        </h1>
        <p className="text-[12px] text-[var(--ivps-text4)] mt-1">
          연습은 발명의 예술입니다 — 작은 성취를 반복하는 방법을 탐색하세요
        </p>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-6 pt-5 pb-10">

          {/* 3분 퀵 루틴 */}
          <QuickRoutine />

          {/* 탭 바 */}
          <div
            className="flex gap-1 mb-5 p-1 rounded-xl"
            style={{ background: 'var(--ivps-nav)' }}
          >
            {GUIDE_SECTIONS.map(section => {
              const isActive = activeTab === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTab(section.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-[12px] font-semibold transition-all"
                  style={{
                    background: isActive ? 'var(--ivps-surface)' : 'transparent',
                    color: isActive ? 'var(--ivps-text1)' : 'var(--ivps-text4)',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.15)' : 'none',
                  }}
                >
                  <span className="text-[14px]">{section.icon}</span>
                  <span className="hidden sm:inline">{section.title}</span>
                </button>
              );
            })}
          </div>

          {/* 탭 컨텐츠 */}
          {activeSection && <SectionPanel key={activeSection.id} section={activeSection} />}
        </div>
      </div>
    </div>
  );
}
