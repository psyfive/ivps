// src/components/phases/before/SkillSearchBrowser.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 전체 스킬 검색/브라우즈 (점진적 노출의 "더보기" 영역)
//
// 기존 CognitiveBriefing의 CartPicker를 그대로 옮긴 것. 추천이 비어 있거나
// 파워유저가 전체 ~100개 taxonomy를 직접 탐색/매핑하고 싶을 때의 escape hatch.
// 드래그-드롭(setSkillDragData) 매핑도 그대로 유지한다.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import {
  buildSkillCartHierarchy,
  getCategoryMeta,
  getSkillDisplayName,
} from '../../../data/taxonomy';
import { setSkillDragData } from '../../../utils/skillDrag';

function SkillRow({ skill, quickTrayIds, selectedSegmentId, onMapSkill, onToggleQuickTray }) {
  const displayName = getSkillDisplayName(skill);
  const isStarred = quickTrayIds.includes(skill.id);
  const handleMap = () => {
    if (!selectedSegmentId) return;
    onMapSkill(skill.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={event => setSkillDragData(event, skill.id)}
      onClick={handleMap}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        handleMap();
      }}
      className={[
        'group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors select-none',
        'hover:bg-[var(--ivps-surface2)]',
        selectedSegmentId ? 'cursor-pointer' : 'cursor-grab',
      ].join(' ')}
      title={selectedSegmentId ? `${displayName} 매핑` : `${displayName} - 구간으로 드래그하거나 먼저 구간을 선택하세요`}
    >
      <span className="text-[11.5px] text-[var(--ivps-text2)] leading-[1.45] flex-1 min-w-0 whitespace-normal break-words">
        {displayName}
      </span>
      <button
        type="button"
        onPointerDown={event => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onToggleQuickTray(skill.id);
        }}
        className="w-5 h-5 flex items-center justify-center rounded text-[12px] text-[var(--ivps-gold)] opacity-65 hover:opacity-100 hover:bg-[var(--ivps-active)] transition-all flex-shrink-0"
        title={isStarred ? 'Quick Tray에서 제거' : 'Quick Tray에 저장'}
        aria-label={isStarred ? `${displayName} Quick Tray에서 제거` : `${displayName} Quick Tray에 저장`}
      >
        {isStarred ? '★' : '☆'}
      </button>
    </div>
  );
}

function CategoryPanel({
  category,
  quickTrayIds,
  selectedSegmentId,
  openGroupIds,
  queryActive,
  onToggleGroup,
  onMapSkill,
  onToggleQuickTray,
}) {
  const meta = category.meta;
  const categoryName = meta.label.replace(/^[A-C]\.\s*/, '');
  const isCategoryC = category.code === 'C';

  return (
    <section
      className={[
        'rounded-lg border overflow-hidden bg-[var(--ivps-surface)]',
        isCategoryC ? 'min-[420px]:col-span-2' : '',
      ].join(' ')}
      style={{ borderColor: `${meta.color}32` }}
    >
      <div
        className="px-2.5 py-2 border-b"
        style={{ background: meta.bg, borderColor: `${meta.color}24` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[10px] font-semibold" style={{ color: meta.color }}>
              {category.code}
            </span>
            <span className="text-[11.5px] font-semibold text-[var(--ivps-text1)] leading-tight whitespace-normal break-words">
              {categoryName}
            </span>
          </div>
          <span className="font-mono text-[9px] text-[var(--ivps-text4)] flex-shrink-0">
            {category.skills.length}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-2">
        {category.groups.map(group => {
          const isOpen = queryActive || openGroupIds.has(group.id);
          return (
          <div key={group.id} className="rounded-md border border-[var(--ivps-border)] bg-[var(--ivps-surface2)] overflow-hidden">
            <button
              type="button"
              onClick={() => onToggleGroup(group.id)}
              className="w-full flex items-start justify-between gap-2 px-2 py-1.5 border-b border-[var(--ivps-border)] text-left hover:bg-[var(--ivps-hover)] transition-colors"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="font-mono text-[8.5px] px-1 py-0.5 rounded"
                  style={{ background: `${meta.color}16`, color: meta.color }}
                >
                  {group.id}
                </span>
                <span className="text-[10.5px] font-semibold text-[var(--ivps-text2)] leading-tight whitespace-normal break-words">
                  {group.name}
                </span>
              </div>
              <span className="font-mono text-[8.5px] text-[var(--ivps-text4)] flex-shrink-0">
                {group.skills.length}
              </span>
              <span
                className="text-[10px] text-[var(--ivps-text4)] flex-shrink-0 transition-transform"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
              >
                ▾
              </span>
            </button>

            {isOpen && (
            <div className="py-1">
              {group.subgroups.map(subgroup => (
                <div key={subgroup.id} className="px-1.5 py-1">
                  <div className="flex items-center gap-1.5 px-1 pb-1">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                    <span className="text-[9px] uppercase tracking-[.06em] text-[var(--ivps-text3)] leading-tight whitespace-normal break-words">
                      {subgroup.label}
                    </span>
                    <span className="font-mono text-[8px] text-[var(--ivps-text4)] flex-shrink-0">
                      {subgroup.skills.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {subgroup.skills.map(skill => (
                      <SkillRow
                        key={skill.id}
                        skill={skill}
                        quickTrayIds={quickTrayIds}
                        selectedSegmentId={selectedSegmentId}
                        onMapSkill={onMapSkill}
                        onToggleQuickTray={onToggleQuickTray}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
          );
        })}
      </div>
    </section>
  );
}

export function SkillSearchBrowser({ selectedSegmentId, quickTraySkillIds, onMapSkill, onToggleQuickTray }) {
  const [query, setQuery] = useState('');
  const [openGroupIds, setOpenGroupIds] = useState(() => new Set());
  const hierarchy = useMemo(() => buildSkillCartHierarchy({ query }), [query]);
  const visibleCount = hierarchy.reduce((sum, category) => sum + category.skills.length, 0);
  const quickTrayIds = quickTraySkillIds ?? [];
  const queryActive = query.trim().length > 0;
  const toggleGroup = useCallback((groupId) => {
    setOpenGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  return (
    <div className="rounded-xl border border-[var(--ivps-border2)] bg-[var(--ivps-surface)] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ivps-border)]">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="스킬 검색..."
          className="flex-1 bg-transparent text-[12.5px] text-[var(--ivps-text1)] placeholder-[var(--ivps-text4)] outline-none"
        />
        <span className="font-mono text-[9.5px] text-[var(--ivps-text4)]">
          {visibleCount}/100
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {visibleCount === 0 ? (
          <div className="px-3 py-5 text-[11.5px] text-[var(--ivps-text4)] text-center">
            검색 결과 없음
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
            {hierarchy.map(category => (
              <CategoryPanel
                key={category.code}
                category={category}
                quickTrayIds={quickTrayIds}
                selectedSegmentId={selectedSegmentId}
                openGroupIds={openGroupIds}
                queryActive={queryActive}
                onToggleGroup={toggleGroup}
                onMapSkill={onMapSkill}
                onToggleQuickTray={onToggleQuickTray}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
