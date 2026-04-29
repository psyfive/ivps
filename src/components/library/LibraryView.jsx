// src/components/library/LibraryView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 스킬 라이브러리 전체 뷰.
//   - 카테고리(A/B/C/D) + 그룹(A-1, A-2…) 2단 필터
//   - 검색 (이름 · 스킬 정의 · ID 전방 일치)
//   - 스킬 카드 그리드 → 클릭 시 SkillDetailModal 열기
//   - 레벨 / XP 진행 바 표시
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import {
  TAXONOMY,
  CATEGORY_META,
  SKILL_GROUPS,
  getCategoryMeta,
} from '../../data/taxonomy';
import { SkillDetailModal } from './SkillDetailModal';

// ── 카테고리 탭 목록 ──────────────────────────────────────────────────────
const CAT_TABS = [
  { code: 'ALL', label: '전체' },
  ...Object.entries(CATEGORY_META).map(([code, meta]) => ({
    code,
    label: meta.label.replace(/^[A-D]\. /, ''), // "A. 왼손 테크닉" → "왼손 테크닉"
  })),
];

// ─────────────────────────────────────────────────────────────────────────────
// SkillCard
// ─────────────────────────────────────────────────────────────────────────────
function SkillCard({ skill, onSelect }) {
  const meta = getCategoryMeta(skill.id);

  return (
    <button
      onClick={() => onSelect(skill.id)}
      className={[
        'w-full text-left rounded-[11px] p-[18px] border transition-all duration-150',
        'ivps-skill-card rounded-[11px] p-[18px]',
      ].join(' ')}
    >
      {/* 상단: ID */}
      <div className="flex items-center mb-0.5">
        <span
          className="font-mono text-[10.5px] px-1.5 py-0.5 rounded"
          style={{ background: `${meta.color}18`, color: meta.color }}
        >
          {skill.id}
        </span>
      </div>

      {/* 스킬명 */}
      <div className="font-serif text-[17px] font-semibold text-[var(--ivps-text1)] mt-2 mb-1 leading-tight">
        {skill.name}
      </div>

      {/* 그룹명 */}
      <span
        className="inline-block text-[11px] px-2 py-0.5 rounded mb-2.5"
        style={{ background: `${meta.color}12`, color: meta.color }}
      >
        {SKILL_GROUPS.find(g => g.id === skill.groupId)?.name ?? skill.groupId}
      </span>

      {/* 스킬 정의 (2줄 클램프) */}
      <p
        className="text-[11.5px] text-[#5a6678] leading-[1.6]"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {skill.corePrinciple}
      </p>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupChip — 그룹 필터 버튼
// ─────────────────────────────────────────────────────────────────────────────
function GroupChip({ group, active, onClick }) {
  const meta = CATEGORY_META[group.category];
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full border text-[11px] font-medium transition-all whitespace-nowrap',
        active
          ? 'font-semibold'
          : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:border-[var(--ivps-border2)] hover:text-[var(--ivps-text2)]',
      ].join(' ')}
      style={active ? {
        background: `${meta.color}15`,
        borderColor: `${meta.color}55`,
        color: meta.color,
      } : {}}
    >
      {group.id} {group.name}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LibraryView
// ─────────────────────────────────────────────────────────────────────────────
export function LibraryView() {
  const { selectedSkill, skill: skillActs, nav, symptomFilter } = usePractice();

  const [activeCat,   setActiveCat]   = useState('ALL');
  const [activeGroup, setActiveGroup] = useState('ALL'); // 'ALL' or groupId
  const [query,       setQuery]       = useState('');

  // ── 필터된 그룹 목록 ──────────────────────────────────────────────
  const visibleGroups = useMemo(() =>
    activeCat === 'ALL'
      ? SKILL_GROUPS
      : SKILL_GROUPS.filter(g => g.category === activeCat),
  [activeCat]);

  // ── 카테고리 바뀌면 그룹 초기화 ───────────────────────────────────
  const handleCatChange = useCallback(code => {
    setActiveCat(code);
    setActiveGroup('ALL');
  }, []);

  // ── 증상 필터 진입 시 카테고리·그룹 초기화 ────────────────────────
  useEffect(() => {
    if (symptomFilter) {
      setActiveCat('ALL');
      setActiveGroup('ALL');
    }
  }, [symptomFilter]);

  // ── 필터된 스킬 목록 ──────────────────────────────────────────────
  const filteredSkills = useMemo(() => {
    let list = TAXONOMY;

    if (symptomFilter) {
      list = list.filter(s =>
        s.after?.some(a =>
          symptomFilter.keywords.some(kw => a.symptom.includes(kw))
        )
      );
    } else {
      if (activeCat !== 'ALL') {
        list = list.filter(s => s.id.startsWith(activeCat));
      }
      if (activeGroup !== 'ALL') {
        list = list.filter(s => s.groupId === activeGroup);
      }
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.corePrinciple.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCat, activeGroup, query, symptomFilter]);

  const totalSkills = TAXONOMY.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── 페이지 헤더 ── */}
      <div className="px-7 pt-6 pb-4 flex-shrink-0 border-b border-[var(--ivps-border)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-serif text-[24px] font-bold text-[var(--ivps-text1)] leading-tight">
              스킬 라이브러리
            </h1>
            <p className="text-[12px] text-[var(--ivps-text3)] mt-1">
              연습할 기술을 선택하세요 &middot; {totalSkills}개 스킬
            </p>
          </div>

          {/* 검색창 */}
          <div className="relative flex-shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ivps-text4)] text-[13px] pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="스킬 검색…"
              className={[
                'pl-8 pr-4 py-2 rounded-lg border bg-[var(--ivps-surface)] text-[12.5px]',
                'text-[var(--ivps-text1)] placeholder-[#3d4455] outline-none',
                'border-[var(--ivps-border)] focus:border-[rgba(212,168,67,.4)]',
                'transition-colors w-52',
              ].join(' ')}
            />
          </div>
        </div>

        {/* 증상 필터 활성 배너 */}
        {symptomFilter && (
          <div
            className="flex items-center justify-between px-3.5 py-2 rounded-lg mb-3"
            style={{
              background: 'rgba(212,168,67,.07)',
              border: '1px solid rgba(212,168,67,.28)',
            }}
          >
            <span className="text-[12px]" style={{ color: 'var(--ivps-gold)' }}>
              🩺 증상: <strong>{symptomFilter.label}</strong> 관련 스킬
            </span>
            <button
              onClick={() => skillActs.setSymptomFilter(null)}
              className="text-[11px] transition-colors"
              style={{ color: 'var(--ivps-text4)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--ivps-gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ivps-text4)'; }}
            >
              ✕ 해제
            </button>
          </div>
        )}

        {/* 카테고리 탭 */}
        <div className="flex gap-1.5 flex-wrap">
          {CAT_TABS.map(({ code, label }) => {
            const isActive = activeCat === code;
            const meta     = code !== 'ALL' ? CATEGORY_META[code] : null;
            return (
              <button
                key={code}
                onClick={() => handleCatChange(code)}
                className={[
                  'px-3.5 py-1.5 rounded-full border text-[12px] font-medium transition-all',
                  isActive
                    ? ''
                    : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:border-[var(--ivps-border2)] hover:text-[var(--ivps-text2)]',
                ].join(' ')}
                style={isActive && meta ? {
                  background: `${meta.color}14`,
                  borderColor: `${meta.color}50`,
                  color: meta.color,
                } : isActive ? {
                  background: 'rgba(212,168,67,.12)',
                  borderColor: 'rgba(212,168,67,.4)',
                  color: '#d4a843',
                } : {}}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 그룹 칩 스크롤 ── */}
      {visibleGroups.length > 0 && (
        <div className="px-7 py-3 border-b border-[var(--ivps-border)] flex-shrink-0 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <GroupChip
              group={{ id: 'ALL', name: '전체 그룹', category: activeCat === 'ALL' ? 'A' : activeCat }}
              active={activeGroup === 'ALL'}
              onClick={() => setActiveGroup('ALL')}
            />
            {visibleGroups.map(g => (
              <GroupChip
                key={g.id}
                group={g}
                active={activeGroup === g.id}
                onClick={() => setActiveGroup(g.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 스킬 그리드 ── */}
      <div className="flex-1 overflow-y-auto px-7 py-5">

        {/* 결과 카운트 */}
        <div className="text-[10px] text-[var(--ivps-text4)] font-mono mb-4">
          {filteredSkills.length}개 스킬
          {query && ` — "${query}" 검색 결과`}
        </div>

        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-[36px] opacity-20">🎻</div>
            <div className="text-[13px] text-[var(--ivps-text4)] text-center leading-relaxed">
              검색 결과가 없습니다.<br />
              <button
                onClick={() => { setQuery(''); setActiveCat('ALL'); setActiveGroup('ALL'); }}
                className="mt-2 text-[var(--ivps-gold)] hover:underline text-[12px]"
              >
                필터 초기화
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
            {filteredSkills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onSelect={skillActs.openSkillModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── SkillDetailModal ── */}
      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={skillActs.closeSkillModal}
          onStartPractice={id => nav.goSkillPractice(id)}
        />
      )}
    </div>
  );
}
