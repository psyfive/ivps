// src/components/phases/CognitiveBriefing.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — BEFORE
//
// 탭 구조:
//   "준비" — Skill Cart(오늘의 스킬) + 구간 클릭 매핑(Tap-to-map)
//   "상세" — 선택된 스킬의 정의·감각 가이드·체크포인트 미리보기
//
// 매핑 흐름:
//   1. 구간 확정 → 2. 구간 클릭 → 3. 카트의 스킬 클릭 → 즉시 매핑
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import {
  buildSkillCartHierarchy,
  getCategoryMeta,
  getSkillById,
  getSkillDisplayName,
} from '../../data/taxonomy';
import { BeforeGuideList } from '../common/BeforeGuideList';
import { requestNativeFullscreen } from '../../utils/nativeFullscreen';
import { getSkillDragData, hasSkillDragData, setSkillDragData } from '../../utils/skillDrag';

// ════════════════════════════════════════════════════════════════════════════
// 1. Skill Cart — A/B/C 계층형 매핑 보드
// ════════════════════════════════════════════════════════════════════════════
function CartSkillRow({ skill, quickTrayIds, selectedSegmentId, onMapSkill, onToggleQuickTray }) {
  const meta = getCategoryMeta(skill.id);
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
      <span
        className="font-mono text-[8.5px] px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ background: `${meta.color}18`, color: meta.color }}
      >
        {skill.id}
      </span>
      <span className="text-[11.5px] text-[var(--ivps-text2)] leading-snug flex-1 min-w-0 truncate">
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

function CartCategoryPanel({
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
            <span className="text-[11.5px] font-semibold text-[var(--ivps-text1)] truncate">
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
                <span className="text-[10.5px] font-semibold text-[var(--ivps-text2)] leading-tight truncate">
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
                    <span className="text-[9px] uppercase tracking-[.06em] text-[var(--ivps-text3)] truncate">
                      {subgroup.label}
                    </span>
                    <span className="font-mono text-[8px] text-[var(--ivps-text4)] flex-shrink-0">
                      {subgroup.skills.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {subgroup.skills.map(skill => (
                      <CartSkillRow
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

function CartPicker({ selectedSegmentId, quickTraySkillIds, onMapSkill, onToggleQuickTray }) {
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
    <div className="rounded-xl border border-[var(--ivps-border2)] bg-[var(--ivps-surface)] overflow-hidden mb-3">
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
              <CartCategoryPanel
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

// ════════════════════════════════════════════════════════════════════════════
// 2. Quick Tray — 악보를 넘어 유지되는 빠른 매핑 목록
// ════════════════════════════════════════════════════════════════════════════
function ScoreQuickTray({ quickTraySkillIds, selectedSegmentId, onTapMap, onRemove }) {
  const skills = (quickTraySkillIds ?? []).map(id => getSkillById(id)).filter(Boolean);

  return (
    <div className="mt-2 pt-2 border-t border-[var(--ivps-border)]">
      <div className="text-[9.5px] uppercase tracking-[.07em] text-[var(--ivps-gold)] mb-1.5 flex items-center gap-1">
        <span>★</span> Quick Tray
      </div>
      {skills.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--ivps-border2)] px-3 py-2 text-center text-[10.5px] text-[var(--ivps-text4)]">
          Skill Cart의 ☆를 켜면 여기에 저장됩니다.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {skills.map(s => {
            const meta = getCategoryMeta(s.id);
            const isDisabled = !selectedSegmentId;
            const displayName = getSkillDisplayName(s);
            return (
              <div
                key={s.id}
                draggable
                onDragStart={event => setSkillDragData(event, s.id)}
                className={`flex items-center gap-1 pl-2 pr-1 py-1 rounded-full border text-[10px] transition-opacity select-none ${isDisabled ? 'cursor-grab hover:opacity-90' : 'cursor-pointer hover:opacity-90'}`}
                style={{ background: `${meta.color}10`, borderColor: `${meta.color}30`, color: meta.color }}
                title={isDisabled ? `${displayName} - 구간으로 드래그하거나 먼저 구간을 선택하세요` : `${displayName} 매핑`}
                onClick={() => { if (!isDisabled) onTapMap(s.id); }}
              >
                <span className="font-mono">{s.id}</span>
                <span className="text-[11px] text-[var(--ivps-text2)] max-w-[68px] truncate">{displayName}</span>
                <button
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onRemove(s.id); }}
                  className="ml-0.5 w-4 h-4 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity text-[10px]"
                  title="Quick Tray에서 제거"
                >×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// 3. Segment Row
// ════════════════════════════════════════════════════════════════════════════
function SegmentRow({ segment, index, onDelete, onUnmap, isSelected, onSelect, onSetMeta, onSkillDrop }) {
  const mappedSkills = segment.mappedSkills.map(id => getSkillById(id)).filter(Boolean);
  const [dropActive, setDropActive] = useState(false);
  const measureCount = segment.measureCount ?? null;
  const measureSourceLabel = segment.measureCountSource === 'manual' ? '수동' : '자동';

  const handleDragOver = useCallback((event) => {
    if (!hasSkillDragData(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setDropActive(false);
  }, []);

  const handleDrop = useCallback((event) => {
    const skillId = getSkillDragData(event);
    if (!skillId) return;
    event.preventDefault();
    event.stopPropagation();
    setDropActive(false);
    onSkillDrop(segment.id, skillId);
  }, [onSkillDrop, segment.id]);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : segment.id); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'rounded-xl border p-2.5 mb-2 transition-all cursor-pointer',
        dropActive
          ? 'border-[var(--ivps-gold)] bg-[var(--ivps-gold-bg)] shadow-[0_0_0_1px_var(--ivps-gold-border)]'
          : isSelected
          ? 'border-[var(--ivps-gold-border)] bg-[var(--ivps-gold-bg)]'
          : 'border-[var(--ivps-border)] bg-[var(--ivps-surface)] hover:border-[var(--ivps-plum-border)]',
      ].join(' ')}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[10px] text-[var(--ivps-text3)]">
            {index + 1}구간
          </span>
          <span className="px-1.5 py-0.5 rounded border border-[var(--ivps-border)] text-[9.5px] text-[var(--ivps-text3)] bg-[var(--ivps-bg)]">
            {measureCount ? `${measureSourceLabel} ${measureCount}마디` : '마디 ?'}
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(segment.id); }}
          className="text-[10px] text-[var(--ivps-text4)] hover:text-[var(--ivps-rust)] transition-colors"
        >✕</button>
      </div>

      {/* 매핑된 스킬 */}
      {mappedSkills.length === 0 ? (
        <div className="text-[10.5px] py-2 text-center rounded-lg border border-dashed border-[var(--ivps-border2)] text-[var(--ivps-text4)]">
          구간 선택 후 카트에서 스킬을 탭하세요
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {mappedSkills.map(s => {
            const meta = getCategoryMeta(s.id);
            return (
              <div key={s.id}
                className="flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full border text-[10px]"
                style={{ background: `${meta.color}10`, borderColor: `${meta.color}28`, color: meta.color }}
              >
                <span className="font-mono">{s.id}</span>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onUnmap(segment.id, s.id); }}
                  className="opacity-50 hover:opacity-100 text-[9px] transition-opacity"
                >×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 목표 메타 — 선택 시만 표시 */}
      {isSelected && (
        <div
          className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--ivps-divider)]"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          <span className="text-[9.5px] text-[var(--ivps-text4)] font-mono flex-shrink-0">목표</span>
          <div className="flex items-center gap-1">
            <span className="text-[9.5px] text-[var(--ivps-gold)]">♩</span>
            <input
              type="number"
              min="20" max="240"
              value={segment.targetBpm ?? ''}
              placeholder="BPM"
              className="w-14 px-1.5 py-0.5 rounded text-[10.5px] font-mono bg-[var(--ivps-gold-bg)] border border-[var(--ivps-gold-border)] text-[var(--ivps-gold)] placeholder-[var(--ivps-text4)] outline-none focus:border-[var(--ivps-gold)] text-center"
              onChange={e => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                onSetMeta(segment.id, { targetBpm: v });
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9.5px] text-[var(--ivps-text3)]">×</span>
            <input
              type="number"
              min="1" max="100"
              value={segment.targetReps ?? ''}
              placeholder="회"
              className="w-12 px-1.5 py-0.5 rounded text-[10.5px] font-mono bg-[var(--ivps-plum-bg)] border border-[var(--ivps-plum-border)] text-[var(--ivps-plum)] placeholder-[var(--ivps-text4)] outline-none focus:border-[var(--ivps-plum)] text-center"
              onChange={e => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                onSetMeta(segment.id, { targetReps: v });
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9.5px] text-[var(--ivps-text3)]">마디</span>
            <input
              type="number"
              min="1" max="999"
              value={segment.measureCount ?? ''}
              placeholder="?"
              className="w-12 px-1.5 py-0.5 rounded text-[10.5px] font-mono bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] text-[var(--ivps-text2)] placeholder-[var(--ivps-text4)] outline-none focus:border-[var(--ivps-gold)] text-center"
              onChange={e => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                onSetMeta(segment.id, { measureCount: v, measureCountSource: 'manual' });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getStartFlowFromPoint(point, menuEl, interleavedDisabled) {
  if (!point || !menuEl) return null;
  const rect = menuEl.getBoundingClientRect();
  const inset = 14;
  const withinX = point.x >= rect.left - inset && point.x <= rect.right + inset;
  const withinY = point.y >= rect.top - inset && point.y <= rect.bottom + inset;
  if (!withinX || !withinY) return null;
  const mode = point.x < rect.left + rect.width / 2 ? 'ordered' : 'interleaved';
  return mode === 'interleaved' && interleavedDisabled ? null : mode;
}

function StartPracticeRadialButton({ mode, segmentCount, onSetMode, onStart }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverMode, setHoverMode] = useState(null);
  const [longPressed, setLongPressed] = useState(false);
  const menuRef = useRef(null);
  const timerRef = useRef(null);
  const interleavedDisabled = segmentCount < 2;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setHoverMode(null);
    setLongPressed(false);
  }, []);

  const chooseMode = useCallback((nextMode) => {
    if (!nextMode) return;
    onSetMode(nextMode);
    closeMenu();
    onStart();
  }, [closeMenu, onSetMode, onStart]);

  const clearLongPressTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  const onPointerDown = useCallback((event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearLongPressTimer();
    setLongPressed(false);
    timerRef.current = window.setTimeout(() => {
      setLongPressed(true);
      setMenuOpen(true);
      setHoverMode(null);
    }, 420);
  }, [clearLongPressTimer]);

  const onPointerMove = useCallback((event) => {
    if (!menuOpen) return;
    const nextMode = getStartFlowFromPoint(
      { x: event.clientX, y: event.clientY },
      menuRef.current,
      interleavedDisabled
    );
    setHoverMode(nextMode);
  }, [interleavedDisabled, menuOpen]);

  const onPointerUp = useCallback((event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    clearLongPressTimer();
    if (!longPressed) {
      onStart();
      return;
    }
    const nextMode = getStartFlowFromPoint(
      { x: event.clientX, y: event.clientY },
      menuRef.current,
      interleavedDisabled
    );
    if (nextMode) {
      chooseMode(nextMode);
      return;
    }
    closeMenu();
  }, [chooseMode, clearLongPressTimer, closeMenu, interleavedDisabled, longPressed, onStart]);

  const activeLabel = mode === 'interleaved' ? '교차' : '순서';

  return (
    <div className="relative">
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-[calc(100%+12px)] left-1/2 z-40 flex w-[214px] -translate-x-1/2 items-end justify-center gap-2 rounded-[24px] px-3 py-3"
          style={{
            background: 'rgba(18,22,30,.76)',
            border: '1px solid rgba(255,255,255,.12)',
            boxShadow: '0 22px 52px rgba(0,0,0,.32)',
            backdropFilter: 'blur(18px) saturate(1.28)',
          }}
        >
          <button
            type="button"
            onClick={() => chooseMode('ordered')}
            onPointerEnter={() => setHoverMode('ordered')}
            className="h-[72px] flex-1 rounded-l-[30px] rounded-r-[15px] border text-[12.5px] font-bold transition-all"
            style={{
              transform: hoverMode === 'ordered' ? 'translateY(-5px) scale(1.04)' : 'rotate(-6deg)',
              transformOrigin: 'bottom right',
              background: hoverMode === 'ordered' || mode === 'ordered' ? 'rgba(126,168,144,.28)' : 'rgba(255,255,255,.07)',
              borderColor: hoverMode === 'ordered' || mode === 'ordered' ? 'rgba(126,168,144,.55)' : 'rgba(255,255,255,.14)',
              color: hoverMode === 'ordered' || mode === 'ordered' ? '#c8ead6' : 'rgba(255,255,255,.76)',
            }}
          >
            순서
          </button>
          <button
            type="button"
            disabled={interleavedDisabled}
            onClick={() => chooseMode(interleavedDisabled ? null : 'interleaved')}
            onPointerEnter={() => !interleavedDisabled && setHoverMode('interleaved')}
            className="h-[72px] flex-1 rounded-l-[15px] rounded-r-[30px] border text-[12.5px] font-bold transition-all"
            style={{
              transform: hoverMode === 'interleaved' ? 'translateY(-5px) scale(1.04)' : 'rotate(6deg)',
              transformOrigin: 'bottom left',
              background: interleavedDisabled
                ? 'rgba(255,255,255,.035)'
                : hoverMode === 'interleaved' || mode === 'interleaved'
                ? 'rgba(155,127,200,.26)'
                : 'rgba(255,255,255,.07)',
              borderColor: interleavedDisabled
                ? 'rgba(255,255,255,.08)'
                : hoverMode === 'interleaved' || mode === 'interleaved'
                ? 'rgba(155,127,200,.55)'
                : 'rgba(255,255,255,.14)',
              color: interleavedDisabled
                ? 'rgba(255,255,255,.28)'
                : hoverMode === 'interleaved' || mode === 'interleaved'
                ? '#ddccff'
                : 'rgba(255,255,255,.76)',
              cursor: interleavedDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            교차
          </button>
        </div>
      )}

      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="w-full py-3 rounded-xl text-[#0d1117] font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-all hover:opacity-95 select-none"
        style={{
          background: 'linear-gradient(135deg,#7ea890,#5a8070)',
          boxShadow: menuOpen ? '0 16px 34px rgba(126,168,144,.18)' : '0 8px 18px rgba(126,168,144,.08)',
          scale: menuOpen ? '1.01' : '1',
        }}
        title="탭하면 시작, 길게 누르면 순서/교차 선택"
      >
        연습 시작 — During
        <span className="rounded-full bg-[rgba(13,17,23,.14)] px-2 py-0.5 text-[10px] font-bold">
          {activeLabel}
        </span>
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4. 상세 탭 — 스킬 Briefing (기존 보존)
// ════════════════════════════════════════════════════════════════════════════
function BriefingCard({ dotColor, label, children }) {
  return (
    <div className="rounded-[11px] p-4 mb-3 border"
      style={{ background: `${dotColor}09`, borderColor: `${dotColor}22` }}>
      <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] mb-3 flex items-center gap-1.5"
        style={{ color: dotColor }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        {label}
      </div>
      {children}
    </div>
  );
}

function SkillDetail({ skill }) {
  const [checkpointOpen, setCheckpointOpen] = useState(true);
  const [diagOpen, setDiagOpen] = useState(false);
  const meta = getCategoryMeta(skill.id);

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-5">
      <div className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10.5px] mb-1 flex items-center gap-1.5" style={{ color: meta.color }}>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px]"
                style={{ background: `${meta.color}18`, color: meta.color }}>{skill.id}</span>
              <span className="text-[var(--ivps-text3)]">{skill.groupId}</span>
            </div>
            <h2 className="font-serif text-[20px] font-bold text-[var(--ivps-text1)] leading-tight">{getSkillDisplayName(skill)}</h2>
          </div>
        </div>
      </div>

      <BriefingCard label="스킬 정의" dotColor="#d4a843">
        <p className="text-[13.5px] text-[var(--ivps-text1)] leading-[1.75]">{skill.corePrinciple}</p>
      </BriefingCard>

      {skill.before && (
        <BriefingCard label="연습 전 — 감각 가이드" dotColor="#7ea890">
          <BeforeGuideList text={skill.before} className="text-[13px] text-[#8a96a8]" />
        </BriefingCard>
      )}

      <div className="rounded-[11px] border border-[var(--ivps-plum-border)] mb-3 overflow-hidden"
        style={{ background: 'var(--ivps-plum-bg)' }}>
        <button className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => setCheckpointOpen(v => !v)}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] flex items-center gap-1.5 text-[var(--ivps-plum)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ivps-plum)]" />
            During 체크포인트 미리보기
          </div>
          <span className="text-[var(--ivps-text3)] text-[12px]"
            style={{ transform: checkpointOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
        </button>
        {checkpointOpen && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            {skill.during.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--ivps-plum-border)] bg-[var(--ivps-plum-bg)]">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] flex-shrink-0 bg-[var(--ivps-plum-bg)] text-[var(--ivps-plum)]"
                  style={{ opacity: 0.9 }}>{i + 1}</span>
                <span className="text-[13px] text-[var(--ivps-text1)]">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {skill.after?.length > 0 && (
        <div className="rounded-[11px] border border-[rgba(224,112,112,.15)] mb-3 overflow-hidden"
          style={{ background: 'rgba(224,112,112,.04)' }}>
          <button className="w-full flex items-center justify-between px-4 py-3"
            onClick={() => setDiagOpen(v => !v)}>
            <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] flex items-center gap-1.5 text-[var(--ivps-rust)]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e07070]" />
              After 진단 케이스 ({skill.after.length}개)
            </div>
            <span className="text-[var(--ivps-text3)] text-[12px]"
              style={{ transform: diagOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
          </button>
          {diagOpen && (
            <div className="px-4 pb-4">
              {skill.after.map((a, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-[rgba(224,112,112,.1)] last:border-0">
                  <span className="font-mono text-[9.5px] text-[var(--ivps-rust)] mt-0.5 flex-shrink-0 w-10">
                    증상{skill.after.length > 1 ? i + 1 : ''}
                  </span>
                  <span className="text-[11.5px] text-[#6a7688] leading-relaxed">{a.symptom}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 5. CognitiveBriefing — 메인 컴포넌트
// ════════════════════════════════════════════════════════════════════════════
function BeforeSkillDetail({ skill }) {
  const meta = getCategoryMeta(skill.id);

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-5">
      <div className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10.5px] mb-1 flex items-center gap-1.5" style={{ color: meta.color }}>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px]"
                style={{ background: meta.color + '18', color: meta.color }}>{skill.id}</span>
              <span className="text-[var(--ivps-text3)]">{skill.groupId}</span>
            </div>
            <h2 className="font-serif text-[20px] font-bold text-[var(--ivps-text1)] leading-tight">{getSkillDisplayName(skill)}</h2>
          </div>
        </div>
      </div>

      <BriefingCard label="스킬 정의" dotColor="#d4a843">
        <p className="text-[13.5px] text-[var(--ivps-text1)] leading-[1.75]">{skill.corePrinciple}</p>
      </BriefingCard>

      {skill.before && (
        <BriefingCard label="Before 연습 가이드" dotColor="#7ea890">
          <BeforeGuideList text={skill.before} className="text-[13px] text-[#8a96a8]" />
        </BriefingCard>
      )}

      {skill.beforeHtml && (
        <BriefingCard label="Before Detail" dotColor="#7ea890">
          <div
            className="text-[13px] text-[var(--ivps-text1)] leading-[1.75] [&_strong]:text-[var(--ivps-moss)] [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: skill.beforeHtml }}
          />
        </BriefingCard>
      )}
    </div>
  );
}

export function CognitiveBriefing() {
  const {
    activeScore,
    activeSkill,
    quickTraySkills,
    isSelectingSegment,
    selectedSegmentId,
    addingToSegmentId,
    tempSegments,
    nav,
    cart,
    segment: segmentActs,
    practiceFlow,
    practiceFlowMode,
    ui,
  } = usePractice();

  const [tab, setTab] = useState('setup');

  const segments   = activeScore?.segments ?? [];
  const selectedSegment = segments.find(seg => seg.id === selectedSegmentId) ?? null;
  const selectedSegmentSkills = useMemo(() => (
    selectedSegment?.mappedSkills?.map(id => getSkillById(id)).filter(Boolean) ?? []
  ), [selectedSegment]);
  const [detailSkillId, setDetailSkillId] = useState(null);
  const detailSkill = selectedSegmentSkills.find(skill => skill.id === detailSkillId)
    ?? selectedSegmentSkills[0]
    ?? null;

  useEffect(() => {
    setDetailSkillId(selectedSegmentSkills[0]?.id ?? null);
  }, [selectedSegmentId, selectedSegmentSkills]);

  const mapSkillToSegment = useCallback((segmentId, skillId) => {
    if (!segmentId || !skillId) return;
    segmentActs.mapSkillToSegment(segmentId, skillId);
  }, [segmentActs]);

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => segmentActs.selectSegment(null)}>

        {/* ── 탭 헤더 ── */}
        <div className="flex-shrink-0 flex border-b border-[var(--ivps-border)] px-5 pt-4 pb-0 gap-4">
          {[
            { id: 'setup',  label: '준비', sub: '구간·스킬' },
            { id: 'detail', label: '상세', sub: '스킬 내용' },
          ].map(t => (
            <button key={t.id} onClick={(e) => { e.stopPropagation(); setTab(t.id); }}
              className={[
                'pb-2.5 text-left border-b-2 transition-colors',
                tab === t.id
                  ? 'border-[#7ea890] text-[var(--ivps-text1)]'
                  : 'border-transparent text-[var(--ivps-text4)] hover:text-[var(--ivps-text3)]',
              ].join(' ')}>
              <div className="text-[12.5px] font-semibold">{t.label}</div>
              <div className="text-[9.5px] opacity-60">{t.sub}</div>
            </button>
          ))}
        </div>

        {/* ══════════════════
            TAB: 준비
        ══════════════════ */}
        {tab === 'setup' && (
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-3">

            {/* ── SKILL CART ── */}
            <div className="mb-4" onClick={e => e.stopPropagation()}>
              <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold flex items-center gap-1.5 mb-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#d4a843]" />
                Skill Cart
                {selectedSegmentId && (
                  <span className="text-[var(--ivps-gold)] normal-case tracking-normal font-mono text-[9.5px] ml-1">
                    → {segments.findIndex(s => s.id === selectedSegmentId) + 1}구간 매핑
                  </span>
                )}
              </div>

              <CartPicker
                selectedSegmentId={selectedSegmentId}
                quickTraySkillIds={quickTraySkills}
                onMapSkill={(skillId) => mapSkillToSegment(selectedSegmentId, skillId)}
                onToggleQuickTray={cart.toggleQuickTraySkill}
              />

              <ScoreQuickTray
                quickTraySkillIds={quickTraySkills}
                selectedSegmentId={selectedSegmentId}
                onTapMap={(skillId) => mapSkillToSegment(selectedSegmentId, skillId)}
                onRemove={cart.removeQuickTraySkill}
              />
            </div>

            {/* ── SEGMENT LIST ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold flex items-center gap-1.5">
                  <span className={[
                    'inline-block w-1.5 h-1.5 rounded-full',
                    isSelectingSegment ? 'bg-[var(--ivps-plum)] animate-pulse' : 'bg-[var(--ivps-plum)]',
                  ].join(' ')} />
                  구간별 스킬 매핑
                  {segments.length > 0 && (
                    <span className="font-mono text-[9px] text-[var(--ivps-text4)] ml-1">({segments.length})</span>
                  )}
                </div>
                {/* 구간 설정 토글 버튼 (ScoreViewer 오버레이와 동일 기능) */}
                {!isSelectingSegment ? (
                  selectedSegmentId ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        segmentActs.startAddToSegment(selectedSegmentId);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all bg-[var(--ivps-gold-bg)] border-[var(--ivps-gold-border)] text-[var(--ivps-gold)] hover:bg-[var(--ivps-active)]"
                    >
                      <span className="text-[11px] leading-none">＋</span>
                      구간 추가
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        segmentActs.toggleSegmentMode();
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all bg-[var(--ivps-plum-bg)] border-[var(--ivps-plum-border)] text-[var(--ivps-plum)] hover:bg-[var(--ivps-hover)]"
                    >
                      <span className="text-[11px] leading-none">＋</span>
                      구간 설정
                    </button>
                  )
                ) : tempSegments.length > 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      segmentActs.commitTempSegments();
                    }}
                    className={[
                      'flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all animate-pulse hover:animate-none',
                      addingToSegmentId
                        ? 'bg-[var(--ivps-gold-bg)] border-[var(--ivps-gold-border)] text-[var(--ivps-gold)] hover:bg-[var(--ivps-active)]'
                        : 'bg-[var(--ivps-plum-bg)] border-[var(--ivps-plum-border)] text-[var(--ivps-plum)] hover:bg-[var(--ivps-hover)]',
                    ].join(' ')}
                  >
                    <span className="text-[11px] leading-none">✓</span>
                    {addingToSegmentId ? `추가 확정 ${tempSegments.length}개` : `확정 ${tempSegments.length}개`}
                  </button>
                ) : (
                  <span className="text-[9.5px] text-[var(--ivps-plum)] animate-pulse">
                    {addingToSegmentId ? '추가 중…' : '그리는 중…'}
                  </span>
                )}
              </div>

              {/* 구간 행 외부 클릭 시 선택 해제 */}
              {segments.length === 0 ? (
                <div className={[
                  'text-[11px] text-center py-5 rounded-xl border border-dashed transition-colors',
                  isSelectingSegment
                    ? 'border-[var(--ivps-plum-border)] text-[var(--ivps-plum)] bg-[var(--ivps-plum-bg)]'
                    : 'border-[var(--ivps-border2)] text-[var(--ivps-text4)]',
                ].join(' ')}>
                  {isSelectingSegment
                    ? '악보 위를 드래그하여 구간을 그리세요'
                    : '"구간 설정" 버튼을 눌러 악보에서 구간을 드래그하세요'}
                </div>
              ) : (
                segments.map((seg, i) => (
                  <SegmentRow
                    key={seg.id}
                    segment={seg}
                    index={i}
                    isSelected={seg.id === selectedSegmentId}
                    onSelect={segmentActs.selectSegment}
                    onDelete={segmentActs.deleteSegment}
                    onUnmap={segmentActs.unmapSkillFromSegment}
                    onSetMeta={segmentActs.setSegmentMeta}
                    onSkillDrop={mapSkillToSegment}
                  />
                ))
              )}

              {segments.length > 0 && (
                <div className="text-[10.5px] text-[var(--ivps-text4)] text-center mt-2">
                  {selectedSegmentId
                    ? '검색 결과의 스킬을 탭하면 이 구간에 바로 매핑됩니다'
                    : '구간을 선택하면 검색 결과 탭으로 바로 매핑할 수 있습니다'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════
            TAB: 상세
        ══════════════════ */}
        {tab === 'detail' && (
          <div className="flex flex-col flex-1 min-h-0" onClick={e => e.stopPropagation()}>
            {selectedSegment ? (
              selectedSegmentSkills.length > 0 ? (
                <>
                  {selectedSegmentSkills.length > 1 && (
                    <div className="flex-shrink-0 flex gap-1.5 px-5 pt-4 pb-1 overflow-x-auto">
                      {selectedSegmentSkills.map(skill => {
                        const meta = getCategoryMeta(skill.id);
                        const isActive = detailSkill?.id === skill.id;
                        return (
                          <button
                            key={skill.id}
                            onClick={() => setDetailSkillId(skill.id)}
                            className={[
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all whitespace-nowrap',
                              isActive
                                ? 'bg-[var(--ivps-surface)]'
                                : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text4)] hover:text-[var(--ivps-text2)]',
                            ].join(' ')}
                            style={isActive ? { borderColor: meta.color + '55', color: meta.color } : {}}
                          >
                            <span className="font-mono">{skill.id}</span>
                            <span className="max-w-[90px] truncate">{getSkillDisplayName(skill)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {detailSkill && <BeforeSkillDetail skill={detailSkill} />}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 gap-4 px-8 text-center">
                  <div className="text-[38px] opacity-20">+</div>
                  <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
                    선택한 구간에 매핑된 스킬이 없습니다.<br />준비 탭에서 스킬을 탭하여 매핑하세요.
                  </div>
                </div>
              )
            ) : activeSkill ? (
              <BeforeSkillDetail skill={activeSkill} />
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-4 px-8 text-center">
                <div className="text-[38px] opacity-20">?</div>
                <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
                  구간을 선택하면<br />해당 구간의 Before 연습상세를 볼 수 있습니다.
                </div>
                <button onClick={() => nav.navigate('library')}
                  className="px-4 py-2 bg-[rgba(212,168,67,.08)] border border-[rgba(212,168,67,.3)] rounded-lg text-[var(--ivps-gold)] text-[12.5px] hover:bg-[rgba(212,168,67,.14)] transition-colors">
                  스킬 라이브러리로 가기
                </button>
              </div>
            )}
          </div>
        )}

        <div className="px-5 pb-5 pt-3 flex-shrink-0">
          <StartPracticeRadialButton
            mode={practiceFlowMode}
            segmentCount={segments.length}
            onSetMode={practiceFlow.setMode}
            onStart={() => {
              ui.setPracticeFullscreen(true);
              requestNativeFullscreen();
              nav.setPhase('during');
            }}
          />
        </div>
      </div>
  );
}
