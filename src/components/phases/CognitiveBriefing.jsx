// src/components/phases/CognitiveBriefing.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — BEFORE  (v3.2 시각적 구간 매핑)
//
// 탭 구조:
//   "준비" — Skill Cart(오늘의 스킬) + 구간 매핑(dnd-kit Drag-and-Drop)
//   "상세" — 선택된 스킬의 정의·감각 가이드·체크포인트 미리보기
//
// dnd-kit 흐름:
//   Skill Cart 아이템(Draggable) → 구간 리스트 행(Droppable)으로 드랍
//   → mapSkillToSegment(segmentId, skillId) 호출
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { usePractice } from '../../context/PracticeContext';
import { getCategoryMeta, TAXONOMY, getSkillById } from '../../data/taxonomy';
import { requestNativeFullscreen } from '../../utils/nativeFullscreen';

// ════════════════════════════════════════════════════════════════════════════
// 1. Skill Cart Picker — 인라인 검색창
// ════════════════════════════════════════════════════════════════════════════
const CAT_FILTERS = ['전체', 'A', 'B', 'C', 'D'];

function CartPicker({ cartIds, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('전체');

  const results = useMemo(() => {
    const q = query.toLowerCase();
    return TAXONOMY.filter(s => {
      if (cartIds.includes(s.id)) return false;
      if (catFilter !== '전체' && !s.id.startsWith(catFilter)) return false;
      return !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    }).slice(0, 20);
  }, [query, catFilter, cartIds]);

  return (
    <div className="rounded-xl border border-[var(--ivps-border2)] bg-[var(--ivps-surface)] overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ivps-border)]">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="스킬 검색..."
          className="flex-1 bg-transparent text-[12.5px] text-[var(--ivps-text1)] placeholder-[var(--ivps-text4)] outline-none"
        />
        <button onClick={onClose} className="text-[var(--ivps-text4)] hover:text-[var(--ivps-text2)] text-[12px] transition-colors">✕</button>
      </div>
      <div className="flex gap-1 px-3 py-1.5 border-b border-[var(--ivps-border)]">
        {CAT_FILTERS.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${catFilter === c ? 'bg-[rgba(212,168,67,.2)] text-[var(--ivps-gold)]' : 'text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]'}`}
          >{c}</button>
        ))}
      </div>
      <div className="max-h-[160px] overflow-y-auto">
        {results.length === 0 ? (
          <div className="px-3 py-4 text-[11.5px] text-[var(--ivps-text4)] text-center">검색 결과 없음</div>
        ) : results.map(s => {
          const meta = getCategoryMeta(s.id);
          return (
            <button key={s.id} onClick={() => onAdd(s.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--ivps-surface2)] transition-colors text-left">
              <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: `${meta.color}18`, color: meta.color }}>{s.id}</span>
              <span className="text-[12px] text-[var(--ivps-text2)] truncate">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Draggable Skill Pill (dnd-kit)
// ════════════════════════════════════════════════════════════════════════════
function DraggableSkillPill({ skill, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: skill.id,
    data: { type: 'skill', skillId: skill.id },
  });
  const meta = getCategoryMeta(skill.id);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-full border select-none touch-none"
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        background: `${meta.color}10`,
        borderColor: `${meta.color}30`,
        color: meta.color,
      }}
    >
      <span className="font-mono text-[10px]">{skill.id}</span>
      <span className="text-[11px] text-[var(--ivps-text2)] max-w-[68px] truncate">{skill.name}</span>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onRemove(skill.id); }}
        className="ml-0.5 w-4 h-4 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity text-[10px]"
      >✕</button>
    </div>
  );
}

// ── Drag Overlay 미리보기 ─────────────────────────────────────────────────
function SkillDragPreview({ skillId }) {
  const skill = getSkillById(skillId);
  if (!skill) return null;
  const meta = getCategoryMeta(skill.id);
  return (
    <div className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border shadow-lg"
      style={{ background: `${meta.color}20`, borderColor: `${meta.color}50`, color: meta.color }}>
      <span className="font-mono text-[10px]">{skill.id}</span>
      <span className="text-[11px]">{skill.name}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Droppable Segment Row (dnd-kit)
// ════════════════════════════════════════════════════════════════════════════
function DroppableSegmentRow({ segment, index, onDelete, onUnmap, isSelected, onSelect, onSetMeta }) {
  const { isOver, setNodeRef } = useDroppable({ id: segment.id });
  const mappedSkills = segment.mappedSkills.map(id => getSkillById(id)).filter(Boolean);

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : segment.id); }}
      className={[
        'rounded-xl border p-2.5 mb-2 transition-all cursor-pointer',
        isOver
          ? 'border-[rgba(126,168,144,.6)] bg-[rgba(126,168,144,.12)] scale-[1.01]'
          : isSelected
          ? 'border-[rgba(212,168,67,.5)] bg-[rgba(212,168,67,.06)]'
          : 'border-[var(--ivps-border)] bg-[var(--ivps-surface)] hover:border-[rgba(155,127,200,.3)]',
      ].join(' ')}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[var(--ivps-text3)]">
            {index + 1}구간
          </span>
          {isOver && (
            <span className="text-[9.5px] text-[#7ea890] font-medium animate-pulse">
              드랍하세요
            </span>
          )}
        </div>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(segment.id); }}
          className="text-[10px] text-[var(--ivps-text4)] hover:text-[#e07070] transition-colors"
        >✕</button>
      </div>

      {/* 매핑된 스킬 */}
      {mappedSkills.length === 0 ? (
        <div className={[
          'text-[10.5px] py-2 text-center rounded-lg border border-dashed transition-colors',
          isOver
            ? 'border-[rgba(126,168,144,.4)] text-[#7ea890]'
            : 'border-[var(--ivps-border2)] text-[var(--ivps-text4)]',
        ].join(' ')}>
          스킬을 드래그해 놓으세요
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
          className="flex items-center gap-2 mt-2 pt-2 border-t border-[rgba(212,168,67,.12)]"
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
              className="w-14 px-1.5 py-0.5 rounded text-[10.5px] font-mono bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.2)] text-[var(--ivps-gold)] placeholder-[rgba(212,168,67,.3)] outline-none focus:border-[rgba(212,168,67,.5)] text-center"
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
              className="w-12 px-1.5 py-0.5 rounded text-[10.5px] font-mono bg-[rgba(155,127,200,.06)] border border-[rgba(155,127,200,.2)] text-[var(--ivps-plum)] placeholder-[rgba(155,127,200,.3)] outline-none focus:border-[rgba(155,127,200,.5)] text-center"
              onChange={e => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                onSetMeta(segment.id, { targetReps: v });
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
            <h2 className="font-serif text-[20px] font-bold text-[var(--ivps-text1)] leading-tight">{skill.name}</h2>
          </div>
          <div className="flex-shrink-0">
            <div className="font-mono text-[10px] text-[var(--ivps-text3)] mb-1">Lv.{skill.level}</div>
            <div className="h-1 w-14 bg-[var(--ivps-surface2)] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.round((skill.xp / skill.maxXp) * 100)}%`, background: meta.color }} />
            </div>
          </div>
        </div>
      </div>

      <BriefingCard label="스킬 정의" dotColor="#d4a843">
        <p className="text-[13.5px] text-[var(--ivps-text1)] leading-[1.75]">{skill.corePrinciple}</p>
      </BriefingCard>

      {skill.before && (
        <BriefingCard label="연습 전 — 감각 가이드" dotColor="#7ea890">
          <p className="text-[13px] text-[#8a96a8] leading-[1.8]">{skill.before}</p>
        </BriefingCard>
      )}

      <div className="rounded-[11px] border border-[rgba(155,127,200,.15)] mb-3 overflow-hidden"
        style={{ background: 'rgba(155,127,200,.04)' }}>
        <button className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => setCheckpointOpen(v => !v)}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] flex items-center gap-1.5 text-[var(--ivps-plum)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9b7fc8]" />
            During 체크포인트 미리보기
          </div>
          <span className="text-[var(--ivps-text3)] text-[12px]"
            style={{ transform: checkpointOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
        </button>
        {checkpointOpen && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            {skill.during.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(155,127,200,.07)', border: '1px solid rgba(155,127,200,.12)' }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] flex-shrink-0"
                  style={{ background: 'rgba(155,127,200,.18)', color: '#9b7fc8' }}>{i + 1}</span>
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
            <h2 className="font-serif text-[20px] font-bold text-[var(--ivps-text1)] leading-tight">{skill.name}</h2>
          </div>
          <div className="flex-shrink-0">
            <div className="font-mono text-[10px] text-[var(--ivps-text3)] mb-1">Lv.{skill.level}</div>
            <div className="h-1 w-14 bg-[var(--ivps-surface2)] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: Math.round((skill.xp / skill.maxXp) * 100) + '%', background: meta.color }} />
            </div>
          </div>
        </div>
      </div>

      <BriefingCard label="스킬 정의" dotColor="#d4a843">
        <p className="text-[13.5px] text-[var(--ivps-text1)] leading-[1.75]">{skill.corePrinciple}</p>
      </BriefingCard>

      {skill.before && (
        <BriefingCard label="Before 연습 가이드" dotColor="#7ea890">
          <p className="text-[13px] text-[#8a96a8] leading-[1.8]">{skill.before}</p>
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
    skillCart,
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
  const [cartPickerOpen, setCartPickerOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState(null); // dnd-kit overlay 용

  const segments   = activeScore?.segments ?? [];
  const cartSkills = skillCart.map(id => getSkillById(id)).filter(Boolean);
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

  // dnd-kit 센서 (Pointer + Touch 통합)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  const handleDragStart = ({ active }) => setActiveDragId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveDragId(null);
    if (!over) return;
    const skillId   = active.id;
    const segmentId = over.id;
    // over.id가 실제 구간 ID인지 확인
    if (segments.some(seg => seg.id === segmentId)) {
      segmentActs.mapSkillToSegment(segmentId, skillId);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#d4a843]" />
                  Skill Cart
                </div>
                <button onClick={() => setCartPickerOpen(v => !v)}
                  className="text-[10.5px] text-[var(--ivps-gold)] border border-[rgba(212,168,67,.3)] px-2 py-0.5 rounded hover:bg-[rgba(212,168,67,.08)] transition-colors font-mono">
                  + 추가
                </button>
              </div>

              {cartPickerOpen && (
                <>
                  {/* 바깥 클릭 시 닫힘 */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setCartPickerOpen(false)}
                  />
                  <div className="relative z-20">
                    <CartPicker
                      cartIds={skillCart}
                      onAdd={cart.addToCart}
                      onClose={() => setCartPickerOpen(false)}
                    />
                  </div>
                </>
              )}

              {cartSkills.length === 0 ? (
                <div className="text-[11.5px] text-[var(--ivps-text4)] text-center py-4 rounded-lg border border-dashed border-[var(--ivps-border2)]">
                  + 추가로 오늘 연습할 스킬을 등록하세요
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {cartSkills.map(s => (
                    <DraggableSkillPill key={s.id} skill={s} onRemove={cart.removeFromCart} />
                  ))}
                </div>
              )}
            </div>

            {/* ── SEGMENT LIST ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold flex items-center gap-1.5">
                  <span className={[
                    'inline-block w-1.5 h-1.5 rounded-full',
                    isSelectingSegment ? 'bg-[#9b7fc8] animate-pulse' : 'bg-[#9b7fc8]',
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
                      className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all bg-[rgba(212,168,67,.1)] border-[rgba(212,168,67,.4)] text-[#d4a843] hover:bg-[rgba(212,168,67,.18)]"
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
                      className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all bg-[rgba(155,127,200,.07)] border-[rgba(155,127,200,.3)] text-[#9b7fc8] hover:bg-[rgba(155,127,200,.15)]"
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
                        ? 'bg-[rgba(212,168,67,.18)] border-[rgba(212,168,67,.58)] text-[#d4a843] hover:bg-[rgba(212,168,67,.26)]'
                        : 'bg-[rgba(155,127,200,.2)] border-[rgba(155,127,200,.6)] text-[#c4a8ff] hover:bg-[rgba(155,127,200,.3)]',
                    ].join(' ')}
                  >
                    <span className="text-[11px] leading-none">✓</span>
                    {addingToSegmentId ? `추가 확정 ${tempSegments.length}개` : `확정 ${tempSegments.length}개`}
                  </button>
                ) : (
                  <span className="text-[9.5px] text-[#9b7fc8] animate-pulse">
                    {addingToSegmentId ? '추가 중…' : '그리는 중…'}
                  </span>
                )}
              </div>

              {/* 구간 행 외부 클릭 시 선택 해제 */}
              {segments.length === 0 ? (
                <div className={[
                  'text-[11px] text-center py-5 rounded-xl border border-dashed transition-colors',
                  isSelectingSegment
                    ? 'border-[rgba(155,127,200,.5)] text-[#9b7fc8] bg-[rgba(155,127,200,.05)]'
                    : 'border-[var(--ivps-border2)] text-[var(--ivps-text4)]',
                ].join(' ')}>
                  {isSelectingSegment
                    ? '악보 위를 드래그하여 구간을 그리세요'
                    : '"구간 설정" 버튼을 눌러 악보에서 구간을 드래그하세요'}
                </div>
              ) : (
                segments.map((seg, i) => (
                  <DroppableSegmentRow
                    key={seg.id}
                    segment={seg}
                    index={i}
                    isSelected={seg.id === selectedSegmentId}
                    onSelect={segmentActs.selectSegment}
                    onDelete={segmentActs.deleteSegment}
                    onUnmap={segmentActs.unmapSkillFromSegment}
                    onSetMeta={segmentActs.setSegmentMeta}
                  />
                ))
              )}

              {/* 안내: 스킬 드래그 힌트 */}
              {segments.length > 0 && cartSkills.length > 0 && (
                <div className="text-[10.5px] text-[var(--ivps-text4)] text-center mt-2">
                  위 스킬을 구간으로 드래그하여 매핑하세요
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
                            <span className="max-w-[90px] truncate">{skill.name}</span>
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
                    선택한 구간에 매핑된 스킬이 없습니다.<br />준비 탭에서 스킬을 이 구간으로 드래그하세요.
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

      {/* dnd-kit DragOverlay — 드래그 중 floating 미리보기 */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeDragId ? <SkillDragPreview skillId={activeDragId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
