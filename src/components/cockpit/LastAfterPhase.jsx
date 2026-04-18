// src/components/cockpit/LastAfterPhase.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 연습 종합 리뷰 화면 (Last After Phase)
// 악보의 모든 구간을 < > 으로 순회하며 스킬별 after 데이터(증상/원인/처방) 확인.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomy';

// ── DiagCell ─────────────────────────────────────────────────────────────────
function DiagCell({ label, color, value }) {
  return (
    <div className="bg-[var(--ivps-surface2)] rounded-lg p-3 border border-[var(--ivps-border)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="inline-block w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[9.5px] uppercase tracking-[.07em] font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="text-[12px] text-[var(--ivps-text1)] leading-relaxed">{value}</div>
    </div>
  );
}

// ── CheckItem ─────────────────────────────────────────────────────────────────
function CheckItem({ text, checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-start gap-2.5 py-2.5 border-b border-[var(--ivps-border)] last:border-0 last:pb-0 text-left group transition-colors"
    >
      <div className={[
        'w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 border transition-all',
        checked
          ? 'bg-[#7ea890] border-[#7ea890] text-white'
          : 'border-[var(--ivps-border2)] bg-transparent group-hover:border-[#7ea890]',
      ].join(' ')}>
        {checked ? '✓' : ''}
      </div>
      <span className={[
        'text-[12px] leading-relaxed transition-colors',
        checked ? 'text-[var(--ivps-text3)] line-through' : 'text-[#c8d0dc]',
      ].join(' ')}>
        {text}
      </span>
    </button>
  );
}

// ── SkillReviewPanel — 단일 스킬의 during 체크 + after 진단 ─────────────────
function SkillReviewPanel({ skill, segment, onToggleCheck }) {
  const [activeDiagIdx, setActiveDiagIdx] = useState(0);
  const catMeta = getCategoryMeta(skill.id);
  const checks = segment.checks ?? [];

  const afterArr = Array.isArray(skill.after) ? skill.after : [skill.after];
  const activeDiag = afterArr[activeDiagIdx] ?? afterArr[0];

  const checkKeys = skill.during.map((_, i) => `during_${i}`);
  const checkedCount = checkKeys.filter(k => checks.includes(k)).length;
  const total = checkKeys.length;
  const allOk = checkedCount >= total;

  return (
    <div className="rounded-xl border border-[var(--ivps-border)] bg-[var(--ivps-surface)] overflow-hidden">
      {/* 스킬 헤더 */}
      <div className="px-4 py-3 border-b border-[var(--ivps-border)] flex items-center gap-2">
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: `${catMeta.color}18`, color: catMeta.color }}
        >
          {skill.id}
        </span>
        <span className="font-serif text-[14px] font-semibold text-[var(--ivps-text1)]">
          {skill.name}
        </span>
        <span className="ml-auto font-mono text-[10px] text-[var(--ivps-plum)]">
          {checkedCount}/{total}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* During 체크리스트 */}
        <div className="bg-[var(--ivps-bg)] rounded-lg border border-[var(--ivps-border)] overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--ivps-border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold">
              During 체크리스트
            </span>
            <div className="h-1 rounded-full overflow-hidden w-20 bg-[var(--ivps-surface2)]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${total > 0 ? (checkedCount / total) * 100 : 0}%`,
                  background: allOk ? '#7ea890' : '#9b7fc8',
                }}
              />
            </div>
          </div>
          <div className="px-3 py-1">
            {skill.during.map((item, i) => (
              <CheckItem
                key={i}
                text={item}
                checked={checks.includes(checkKeys[i])}
                onToggle={() => onToggleCheck(segment.id, checkKeys[i])}
              />
            ))}
          </div>
        </div>

        {/* 진단 케이스 탭 */}
        {afterArr.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {afterArr.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveDiagIdx(i)}
                className={[
                  'px-2.5 py-1 rounded-full border text-[10.5px] transition-colors',
                  activeDiagIdx === i
                    ? 'bg-[rgba(224,112,112,.12)] border-[rgba(224,112,112,.3)] text-[var(--ivps-rust)]'
                    : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
                ].join(' ')}
              >
                케이스 {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* 증상 · 원인 · 처방 */}
        {activeDiag && (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: allOk ? 'rgba(126,168,144,.25)' : 'rgba(224,112,112,.2)' }}
          >
            <div
              className="px-3 py-2 border-b text-[10.5px] font-semibold"
              style={{
                background: allOk ? 'rgba(126,168,144,.06)' : 'rgba(224,112,112,.06)',
                borderColor: allOk ? 'rgba(126,168,144,.15)' : 'rgba(224,112,112,.15)',
                color: allOk ? '#7ea890' : '#e07070',
              }}
            >
              {allOk ? '✓ 체크 완료 — 잘 되고 있습니다!' : '⚠ 트러블슈팅'}
            </div>
            <div className="grid grid-cols-3 gap-2 p-2.5">
              <DiagCell label="증상" color="#e07070" value={activeDiag.symptom} />
              <DiagCell label="원인" color="#d4a843" value={activeDiag.cause} />
              <DiagCell label="처방" color="#7ea890" value={activeDiag.prescription} />
            </div>
          </div>
        )}

        {/* 처방 드릴 강조 */}
        {!allOk && activeDiag?.prescription && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.15)]">
            <span className="text-[14px] flex-shrink-0">💊</span>
            <div>
              <div className="text-[10px] text-[var(--ivps-gold)] font-semibold uppercase tracking-wide mb-1">
                처방 드릴
              </div>
              <div className="text-[12px] text-[var(--ivps-gold)] leading-relaxed">
                {activeDiag.prescription}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LastAfterPhase ────────────────────────────────────────────────────────────
export function LastAfterPhase() {
  const {
    activeScore,
    reviewSegmentIndex,
    nav,
    segment: segmentActs,
  } = usePractice();

  const segments = activeScore?.segments ?? [];
  const total = segments.length;
  const safeIdx = total > 0 ? Math.min(Math.max(0, reviewSegmentIndex), total - 1) : 0;
  const currentSegment = segments[safeIdx] ?? null;

  const hasPrev = safeIdx > 0;
  const hasNext = safeIdx < total - 1;

  const goPrev = useCallback(() => { if (hasPrev) nav.setReviewIndex(safeIdx - 1); }, [hasPrev, safeIdx, nav]);
  const goNext = useCallback(() => { if (hasNext) nav.setReviewIndex(safeIdx + 1); }, [hasNext, safeIdx, nav]);

  // 키보드 내비게이션
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')       goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape')     nav.exitLastAfter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, nav]);

  const segmentSkills = (currentSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-[var(--ivps-bg)] overflow-hidden">

      {/* ── 상단 바 ── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-5 border-b border-[var(--ivps-border)] bg-[var(--ivps-nav)]"
        style={{ height: 52 }}
      >
        <button
          onClick={nav.exitLastAfter}
          className="text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] text-[12px] flex items-center gap-1 px-2 py-1 rounded transition-colors flex-shrink-0"
        >
          ‹ 대시보드
        </button>
        <div className="w-px h-3.5 bg-[var(--ivps-surface2)] flex-shrink-0" />
        <span className="font-semibold text-[14px] text-[var(--ivps-text1)] truncate flex-1">
          연습 종합 리뷰{activeScore?.name ? ` · ${activeScore.name}` : ''}
        </span>

        {/* 구간 내비게이터 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            className="w-7 h-7 flex items-center justify-center rounded border text-[13px] transition-all"
            style={{
              borderColor: hasPrev ? 'rgba(155,127,200,.35)' : 'rgba(255,255,255,.08)',
              color: hasPrev ? '#9b7fc8' : 'rgba(255,255,255,.2)',
              background: hasPrev ? 'rgba(155,127,200,.08)' : 'transparent',
            }}
          >
            ‹
          </button>
          <span className="font-mono text-[12px] text-[var(--ivps-text2)] min-w-[72px] text-center">
            구간 {total > 0 ? safeIdx + 1 : 0} / {total}
          </span>
          <button
            onClick={goNext}
            disabled={!hasNext}
            className="w-7 h-7 flex items-center justify-center rounded border text-[13px] transition-all"
            style={{
              borderColor: hasNext ? 'rgba(155,127,200,.35)' : 'rgba(255,255,255,.08)',
              color: hasNext ? '#9b7fc8' : 'rgba(255,255,255,.2)',
              background: hasNext ? 'rgba(155,127,200,.08)' : 'transparent',
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* ── 구간 점 인디케이터 ── */}
      {total > 1 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2 border-b border-[var(--ivps-border)]">
          {segments.map((_, i) => (
            <button
              key={i}
              onClick={() => nav.setReviewIndex(i)}
              className="rounded-full transition-all"
              style={{
                width: i === safeIdx ? 20 : 6,
                height: 6,
                background: i === safeIdx ? '#9b7fc8' : 'rgba(255,255,255,.15)',
              }}
            />
          ))}
        </div>
      )}

      {/* ── 본문 ── */}
      <div className="flex-1 overflow-y-auto">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="text-[38px] opacity-20">📋</div>
            <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
              이 악보에는 설정된 구간이 없습니다.<br />
              <span className="text-[11px] text-[var(--ivps-text4)]">Before 단계에서 구간을 먼저 설정하세요.</span>
            </div>
            <button
              onClick={nav.exitLastAfter}
              className="px-4 py-2 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-lg text-[var(--ivps-text2)] text-[12px] hover:bg-[#222b3d] transition-colors"
            >
              대시보드로 돌아가기
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">

            {/* 구간 헤더 */}
            <div className="flex items-start justify-between mb-5 gap-4">
              <div>
                <div className="text-[10.5px] text-[var(--ivps-text4)] uppercase tracking-[.07em] font-semibold mb-2">
                  {safeIdx + 1}구간 자가 평가
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {segmentSkills.length === 0 ? (
                    <span className="text-[11px] text-[var(--ivps-text4)]">스킬 미매핑</span>
                  ) : segmentSkills.map(sk => {
                    const meta = getCategoryMeta(sk.id);
                    return (
                      <span
                        key={sk.id}
                        className="px-2 py-0.5 rounded-full text-[10.5px] border"
                        style={{ background: `${meta.color}10`, borderColor: `${meta.color}25`, color: meta.color }}
                      >
                        {sk.id} {sk.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 미니 통계 */}
              <div className="flex gap-2 flex-shrink-0">
                <div className="bg-[var(--ivps-surface)] rounded-lg px-3 py-2 border border-[var(--ivps-border)] text-center min-w-[56px]">
                  <div className="text-[9px] text-[var(--ivps-text3)] uppercase tracking-wide mb-1">체크</div>
                  <div className="font-mono text-[16px] font-semibold" style={{ color: '#9b7fc8' }}>
                    {(currentSegment?.checks ?? []).length}
                  </div>
                </div>
                <div className="bg-[var(--ivps-surface)] rounded-lg px-3 py-2 border border-[var(--ivps-border)] text-center min-w-[56px]">
                  <div className="text-[9px] text-[var(--ivps-text3)] uppercase tracking-wide mb-1">스킬</div>
                  <div className="font-mono text-[16px] font-semibold" style={{ color: '#d4a843' }}>
                    {currentSegment?.mappedSkills?.length ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* 스킬 리뷰 카드 목록 */}
            {segmentSkills.length === 0 ? (
              <div className="text-center py-12 text-[12px] text-[var(--ivps-text4)] border border-dashed border-[var(--ivps-border)] rounded-xl">
                이 구간에 매핑된 스킬이 없습니다.<br />
                <span className="text-[11px]">Before 탭에서 스킬을 매핑하세요.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {segmentSkills.map(sk => (
                  <SkillReviewPanel
                    key={sk.id}
                    skill={sk}
                    segment={currentSegment}
                    onToggleCheck={segmentActs.toggleSegmentCheck}
                  />
                ))}
              </div>
            )}

            {/* 하단 내비게이션 */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--ivps-border)]">
              <button
                onClick={goPrev}
                disabled={!hasPrev}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-[12px] font-medium transition-all"
                style={{
                  borderColor: hasPrev ? 'rgba(155,127,200,.3)' : 'rgba(255,255,255,.08)',
                  color: hasPrev ? '#9b7fc8' : 'rgba(255,255,255,.2)',
                  background: hasPrev ? 'rgba(155,127,200,.06)' : 'transparent',
                  cursor: hasPrev ? 'pointer' : 'default',
                }}
              >
                ← 이전 구간
              </button>

              <button
                onClick={nav.exitLastAfter}
                className="px-4 py-2.5 rounded-lg border text-[12px] font-medium transition-all"
                style={{
                  borderColor: 'rgba(126,168,144,.3)',
                  color: '#7ea890',
                  background: 'rgba(126,168,144,.06)',
                }}
              >
                대시보드로 →
              </button>

              <button
                onClick={goNext}
                disabled={!hasNext}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-[12px] font-medium transition-all"
                style={{
                  borderColor: hasNext ? 'rgba(155,127,200,.3)' : 'rgba(255,255,255,.08)',
                  color: hasNext ? '#9b7fc8' : 'rgba(255,255,255,.2)',
                  background: hasNext ? 'rgba(155,127,200,.06)' : 'transparent',
                  cursor: hasNext ? 'pointer' : 'default',
                }}
              >
                다음 구간 →
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
