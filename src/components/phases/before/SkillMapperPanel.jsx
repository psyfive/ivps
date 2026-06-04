// src/components/phases/before/SkillMapperPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Before '준비' 탭의 스킬 매핑 영역 오케스트레이터.
//
// 인지 과부하(100개 훑기)를 해소하는 3단 흐름:
//   1. 증상/목표 선택 (SymptomGoalChooser)
//   2. 추천 Top-N 매핑     (RecommendedSkillList) ← 기본 노출
//   3. 전체 스킬 검색       (SkillSearchBrowser)   ← 접이식 escape hatch
// + Quick Tray (악보를 넘어 유지되는 즐겨찾기)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { getSymptomCategories, getRecommendedSkills } from '../../../data/taxonomy';
import { SymptomGoalChooser } from './SymptomGoalChooser';
import { RecommendedSkillList } from './RecommendedSkillList';
import { SkillSearchBrowser } from './SkillSearchBrowser';
import { QuickTray } from './QuickTray';

const REC_LIMIT = 6;

export function SkillMapperPanel({
  selectedSegment,
  segmentIndex,
  mappedIds,
  quickTraySkillIds,
  extraSkills = [],
  onMap,                 // (segmentId, skillId, meta) => void
  onSetSymptomTags,      // (segmentId, tagIds) => void
  onToggleQuickTray,     // (skillId) => void
  onRemoveQuickTray,     // (skillId) => void
}) {
  const categories = useMemo(() => getSymptomCategories(), []);
  const selectedSegmentId = selectedSegment?.id ?? null;

  const [activeSymptom, setActiveSymptom] = useState(selectedSegment?.symptomTags?.[0] ?? null);
  const [showAll, setShowAll] = useState(false);

  // 구간이 바뀌면 그 구간에 저장된 증상 태그로 동기화
  useEffect(() => {
    setActiveSymptom(selectedSegment?.symptomTags?.[0] ?? null);
  }, [selectedSegmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const recs = useMemo(() => {
    if (!activeSymptom) return [];
    return getRecommendedSkills({
      symptomId: activeSymptom,
      limit: REC_LIMIT,
      excludeIds: mappedIds ?? [],
      extraSkills,
    });
  }, [activeSymptom, mappedIds, extraSkills]);

  const handlePickSymptom = (symptomId) => {
    setActiveSymptom(symptomId);
    if (selectedSegmentId) {
      onSetSymptomTags(selectedSegmentId, symptomId ? [symptomId] : []);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── 추천 영역: 구간 선택 시에만 ── */}
      {selectedSegment ? (
        <div className="rounded-xl border border-[var(--ivps-gold-border)] bg-[var(--ivps-gold-bg)] p-3 flex flex-col gap-2.5">
          <div className="text-[10px] text-[var(--ivps-gold)] uppercase tracking-[.07em] font-semibold flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ivps-gold)]" />
            {(segmentIndex ?? 0) + 1}구간 — 증상 기반 추천
          </div>

          <SymptomGoalChooser
            categories={categories}
            active={activeSymptom}
            onPick={handlePickSymptom}
          />

          {activeSymptom && (
            <RecommendedSkillList
              recs={recs}
              onMap={(skillId) => onMap(selectedSegmentId, skillId, { source: 'recommended', symptomId: activeSymptom })}
            />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--ivps-border2)] px-3 py-4 text-center text-[11px] text-[var(--ivps-text4)]">
          구간을 선택하면 증상 기반 추천 스킬이 나타납니다.
        </div>
      )}

      {/* ── 점진적 노출: 전체 스킬 검색 (접이식) ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-surface2)] text-[11px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text1)] transition-colors"
          aria-expanded={showAll}
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ivps-text4)]" />
            전체 스킬 검색 <span className="text-[var(--ivps-text4)]">(직접 찾기)</span>
          </span>
          <span className="transition-transform" style={{ transform: showAll ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>

        {showAll && (
          <div className="mt-2">
            <SkillSearchBrowser
              selectedSegmentId={selectedSegmentId}
              quickTraySkillIds={quickTraySkillIds}
              onMapSkill={(skillId) => onMap(selectedSegmentId, skillId, { source: 'search' })}
              onToggleQuickTray={onToggleQuickTray}
            />
          </div>
        )}

        <QuickTray
          quickTraySkillIds={quickTraySkillIds}
          selectedSegmentId={selectedSegmentId}
          onTapMap={(skillId) => onMap(selectedSegmentId, skillId, { source: 'quicktray' })}
          onRemove={onRemoveQuickTray}
        />
      </div>
    </div>
  );
}
