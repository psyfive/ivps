// src/components/phases/PracticeHUD.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — DURING
// Before 구간 선택 → 매핑된 스킬의 during 체크포인트 표시
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomy';

// ── HUD 체크포인트 아이템 ─────────────────────────────────────────────────
function HudItem({ index, text, isFirst, checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={[
        'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150 border',
        checked
          ? 'border-[rgba(155,127,200,.4)] bg-[rgba(155,127,200,.12)]'
          : isFirst
          ? 'border-[rgba(155,127,200,.2)] bg-[rgba(155,127,200,.07)]'
          : 'border-[var(--ivps-border)] bg-[var(--ivps-surface)] hover:border-[rgba(155,127,200,.2)] hover:bg-[rgba(155,127,200,.05)]',
      ].join(' ')}
    >
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
          'text-[13.5px] leading-snug flex-1',
          isFirst ? 'font-semibold text-[var(--ivps-text1)]' : 'font-medium text-[#c8d0dc]',
          checked ? 'line-through opacity-50' : '',
        ].join(' ')}
      >
        {text}
      </span>
      {isFirst && !checked && (
        <span className="text-[9.5px] font-mono text-[var(--ivps-plum)] bg-[rgba(155,127,200,.15)] border border-[rgba(155,127,200,.25)] px-1.5 py-0.5 rounded flex-shrink-0">
          핵심
        </span>
      )}
    </button>
  );
}

// ── 어댑티브 팁 ──────────────────────────────────────────────────────────
function AdaptiveTip({ streak, bpm }) {
  if (streak < 3) return null;
  const msg = streak >= 5
    ? `🔥 ${streak}회 연속 성공! 메트로놈 +5 BPM 고려 (현재 ${bpm})`
    : `⚡ ${streak}회 연속 성공 중 — 집중력 유지!`;
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[rgba(212,168,67,.2)] bg-[rgba(212,168,67,.06)] mb-3">
      <span className="text-[12px] text-[var(--ivps-gold)] flex-1">{msg}</span>
    </div>
  );
}

// ── 구간 없음 안내 ───────────────────────────────────────────────────────
function NoSegmentGuide({ onGoBefore }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="text-[36px] opacity-20">🗂</div>
      <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
        Before 단계에서 구간을 설정하면<br />
        여기서 구간별 스킬 체크포인트를 확인할 수 있습니다.
      </div>
      <button
        onClick={onGoBefore}
        className="px-4 py-2 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-lg text-[var(--ivps-text2)] text-[12px] hover:bg-[#222b3d] transition-colors"
      >
        ← Before 탭으로
      </button>
    </div>
  );
}

// ── 구간 있으나 미선택 안내 ──────────────────────────────────────────────
function SelectSegmentGuide({ segments, selectedSegmentId, onSelect }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="text-[11px] text-[var(--ivps-text3)] uppercase tracking-[.08em] font-semibold mb-1">
          구간 선택
        </div>
        <div className="text-[12px] text-[var(--ivps-text4)] leading-relaxed">
          악보에서 구간을 클릭하거나 아래에서 선택하세요.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="flex flex-col gap-2">
          {segments.map((seg, idx) => {
            const isSelected = seg.id === selectedSegmentId;
            const skillCount = seg.mappedSkills.length;
            return (
              <button
                key={seg.id}
                onClick={() => onSelect(seg.id)}
                className={[
                  'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left border transition-all',
                  isSelected
                    ? 'bg-[rgba(155,127,200,.15)] border-[rgba(155,127,200,.5)]'
                    : 'bg-[var(--ivps-surface)] border-[var(--ivps-border)] hover:border-[rgba(155,127,200,.3)] hover:bg-[rgba(155,127,200,.06)]',
                ].join(' ')}
              >
                <span className="w-8 h-8 rounded-lg bg-[rgba(155,127,200,.15)] text-[var(--ivps-plum)] font-mono text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-[var(--ivps-text1)]">
                    {idx + 1}구간
                  </div>
                  <div className="text-[10.5px] text-[var(--ivps-text4)] mt-0.5">
                    {skillCount > 0
                      ? seg.mappedSkills.map(id => {
                          const sk = getSkillById(id);
                          return sk ? `${sk.id} ${sk.name}` : id;
                        }).join(' · ')
                      : '스킬 미매핑'}
                  </div>
                </div>
                {skillCount > 0 && (
                  <span className="text-[10px] font-mono text-[var(--ivps-plum)] bg-[rgba(155,127,200,.12)] border border-[rgba(155,127,200,.2)] px-1.5 py-0.5 rounded flex-shrink-0">
                    {skillCount}스킬
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 메인 PracticeHUD ──────────────────────────────────────────────────────
export function PracticeHUD() {
  const { activeScore, activeSkill, selectedSegmentId, bpm, nav, ui, segment: segmentActs } = usePractice();

  const segments = activeScore?.segments ?? [];
  const selectedSegment = segments.find(s => s.id === selectedSegmentId) ?? null;
  const segmentIndex = segments.findIndex(s => s.id === selectedSegmentId);

  // 선택된 구간의 스킬 목록
  const segmentSkills = (selectedSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  // 현재 표시할 스킬 탭 인덱스
  const [skillTabIdx, setSkillTabIdx] = useState(0);

  // 구간/스킬 바뀌면 탭 초기화
  useEffect(() => { setSkillTabIdx(0); }, [selectedSegmentId]);

  // 현재 스킬 (탭 선택 or 폴백)
  const skill = segmentSkills[skillTabIdx] ?? activeSkill ?? null;
  const catMeta = skill ? getCategoryMeta(skill.id) : null;
  const duringItems = skill?.during ?? [];

  // 체크포인트 상태
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [streak, setStreak] = useState(0);

  // 스킬 바뀌면 체크 초기화
  useEffect(() => { setCheckedItems(new Set()); }, [skill?.id]);

  const toggleItem = useCallback((i) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  const resetChecks = useCallback(() => setCheckedItems(new Set()), []);

  const handleStreakUp = useCallback(() => {
    setStreak(s => s + 1);
    resetChecks();
  }, [resetChecks]);

  const allChecked = duringItems.length > 0 && checkedItems.size >= duringItems.length;

  // ── 전체화면 복귀 버튼 ───────────────────────────────────────────────
  const FullscreenBtn = () => (
    <button
      onClick={() => ui.setPracticeFullscreen(true)}
      className="mx-5 mt-3 mb-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[11px] font-semibold transition-all flex-shrink-0 bg-[rgba(155,127,200,.07)] border-[rgba(155,127,200,.25)] text-[#9b7fc8] hover:bg-[rgba(155,127,200,.14)]"
    >
      <span className="text-[12px]">⛶</span>
      악보 전체화면
    </button>
  );

  // ── 구간 없음 ──────────────────────────────────────────────────────
  if (segments.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FullscreenBtn />
        <NoSegmentGuide onGoBefore={() => nav.setPhase('before')} />
      </div>
    );
  }

  // ── 구간 있으나 미선택 ──────────────────────────────────────────────
  if (!selectedSegment) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FullscreenBtn />
        <SelectSegmentGuide
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelect={segmentActs.selectSegment}
        />
      </div>
    );
  }

  // ── 구간 선택됨 ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* 전체화면 복귀 */}
      <FullscreenBtn />

      {/* 구간 탭 헤더 */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {segments.map((seg, idx) => (
            <button
              key={seg.id}
              onClick={() => segmentActs.selectSegment(seg.id)}
              className={[
                'px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all',
                seg.id === selectedSegmentId
                  ? 'bg-[rgba(155,127,200,.2)] border-[rgba(155,127,200,.6)] text-[var(--ivps-plum)]'
                  : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text4)] hover:border-[rgba(155,127,200,.3)] hover:text-[var(--ivps-text3)]',
              ].join(' ')}
            >
              {idx + 1}구간
            </button>
          ))}
        </div>

        {/* 스킬 탭 (구간에 스킬이 여러 개일 때) */}
        {segmentSkills.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {segmentSkills.map((sk, i) => {
              const meta = getCategoryMeta(sk.id);
              const isActive = i === skillTabIdx;
              return (
                <button
                  key={sk.id}
                  onClick={() => setSkillTabIdx(i)}
                  className={[
                    'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] border transition-all',
                    isActive
                      ? 'border-current'
                      : 'border-[var(--ivps-border)] text-[var(--ivps-text4)] hover:text-[var(--ivps-text3)]',
                  ].join(' ')}
                  style={isActive ? { background: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}50` } : {}}
                >
                  <span className="font-mono">{sk.id}</span>
                  <span className="hidden sm:inline text-[9.5px] opacity-70">{sk.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] text-[var(--ivps-text4)] italic">
            이 구간에 매핑된 스킬이 없습니다.
          </div>
        )}
      </div>

      {/* 스킬 제목 */}
      {skill && (
        <div className="px-5 py-2 border-t border-b border-[var(--ivps-border)] flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: `${catMeta?.color}18`, color: catMeta?.color }}
            >
              {skill.id}
            </span>
            <span className="font-serif text-[14px] font-semibold text-[var(--ivps-text1)] truncate">
              {skill.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
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
      )}

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-5 py-3">

        <AdaptiveTip streak={streak} bpm={bpm} />

        {/* HUD 라벨 */}
        {duringItems.length > 0 && (
          <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.08em] font-semibold flex items-center gap-1.5 mb-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9b7fc8]" />
            HUD · 집중 체크포인트
            <span className="ml-auto font-mono text-[var(--ivps-plum)]">
              {checkedItems.size}/{duringItems.length}
            </span>
          </div>
        )}

        {/* 체크포인트 목록 */}
        <div className="flex flex-col gap-2 mb-4">
          {duringItems.map((item, i) => (
            <HudItem
              key={i}
              index={i}
              text={item}
              isFirst={i === 0}
              checked={checkedItems.has(i)}
              onToggle={() => toggleItem(i)}
            />
          ))}
          {duringItems.length === 0 && segmentSkills.length > 0 && (
            <div className="text-[12px] text-[var(--ivps-text4)] text-center py-4">
              선택한 스킬에 체크포인트 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 연습 회차 완료 */}
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
            {[['🎯', '완벽했음', '#7ea890'], ['😐', '보통', '#d4a843'], ['😣', '어려웠음', '#e07070']].map(([icon, label, col]) => (
              <button
                key={label}
                onClick={() => {
                  if (label === '완벽했음') handleStreakUp(); else setStreak(0);
                  resetChecks();
                }}
                className="py-2.5 rounded-lg text-[11.5px] font-medium border transition-all hover:scale-[1.02]"
                style={{ background: `${col}12`, borderColor: `${col}30`, color: col }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
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
