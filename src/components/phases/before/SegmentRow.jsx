// src/components/phases/before/SegmentRow.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 구간 1개 행 — 매핑된 스킬 칩 + 목표(BPM/회/마디) 편집 + 드래그-드롭 매핑 수신.
// 기존 CognitiveBriefing의 SegmentRow를 그대로 옮긴 것.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { getSkillById, getCategoryMeta, getSkillDisplayName } from '../../../data/taxonomy';
import { getSkillDragData, hasSkillDragData } from '../../../utils/skillDrag';

export function SegmentRow({ segment, index, onDelete, onUnmap, isSelected, onSelect, onSetMeta, onSkillDrop }) {
  const mappedSkills = segment.mappedSkills.map(id => getSkillById(id)).filter(Boolean);
  const [dropActive, setDropActive] = useState(false);
  const measureCount = segment.measureCount ?? null;
  const measureSourceLabel = segment.measureCountSource === 'manual' ? '수동' : '자동';
  const measureDetected = measureCount !== null;
  const measureBadgeText = measureDetected
    ? `${measureSourceLabel} ${measureCount}마디`
    : '마디 미감지';
  const measureBadgeClass = measureDetected
    ? segment.measureCountSource === 'manual'
      ? 'border-[var(--ivps-plum-border)] bg-[var(--ivps-plum-bg)] text-[var(--ivps-plum)]'
      : 'border-[var(--ivps-gold-border)] bg-[var(--ivps-gold-bg)] text-[var(--ivps-gold)]'
    : 'border-dashed border-[var(--ivps-border2)] bg-[var(--ivps-bg)] text-[var(--ivps-text4)]';

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
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="font-mono text-[10px] text-[var(--ivps-text3)]">
            {index + 1}구간
          </span>
          <span className={[
            'px-1.5 py-0.5 rounded border text-[9.5px] font-semibold shrink-0',
            measureBadgeClass,
          ].join(' ')}>
            {measureBadgeText}
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(segment.id); }}
          className="shrink-0 text-[10px] text-[var(--ivps-text4)] hover:text-[var(--ivps-rust)] transition-colors"
        >✕</button>
      </div>

      {/* 매핑된 스킬 */}
      {mappedSkills.length === 0 ? (
        <div className="text-[10.5px] py-2 text-center rounded-lg border border-dashed border-[var(--ivps-border2)] text-[var(--ivps-text4)]">
          구간 선택 후 증상을 고르고 추천 스킬을 탭하세요
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {mappedSkills.map(s => {
            const meta = getCategoryMeta(s.id);
            const displayName = getSkillDisplayName(s);
            return (
              <div key={s.id}
                className="flex items-start gap-1 pl-2 pr-1 py-1 rounded-lg border text-[10px] max-w-full"
                style={{ background: `${meta.color}10`, borderColor: `${meta.color}28`, color: meta.color }}
                title={`${displayName} (${s.id})`}
              >
                <span className="text-[10.5px] leading-[1.35] whitespace-normal break-words text-[var(--ivps-text2)]">
                  {displayName}
                </span>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onUnmap(segment.id, s.id); }}
                  className="shrink-0 opacity-50 hover:opacity-100 text-[9px] leading-none transition-opacity mt-0.5"
                >×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 목표 메타 — 선택 시만 표시 */}
      {isSelected && (
        <div
          className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[var(--ivps-divider)]"
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
            <span className="text-[9.5px] text-[var(--ivps-text3)] whitespace-nowrap">마디 수</span>
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
