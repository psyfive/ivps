// src/components/phases/CognitiveBriefing.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — BEFORE
//
// 탭 구조:
//   "준비" — 증상 기반 추천 매핑(SkillMapperPanel) + 구간별 스킬 목록
//   "상세" — 선택된 스킬의 정의·감각 가이드·체크포인트 미리보기
//
// 매핑 흐름(인지 과부하 해소):
//   1. 구간 확정 → 2. 구간 선택 → 3. 증상 선택 → 4. 추천 스킬 탭 → 즉시 매핑
//   (전체 100개 직접 탐색은 "전체 스킬 검색" 접이식으로 보존)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import {
  getCategoryMeta,
  getSkillById,
  getSkillDisplayName,
} from '../../data/taxonomy';
import { BeforeGuideList } from '../common/BeforeGuideList';
import { requestNativeFullscreen } from '../../utils/nativeFullscreen';
import { SkillMapperPanel } from './before/SkillMapperPanel';
import { SegmentRow } from './before/SegmentRow';

// ════════════════════════════════════════════════════════════════════════════
// 연습 시작 — 순서/교차 선택 라디얼 버튼
// ════════════════════════════════════════════════════════════════════════════
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
// 상세 탭 — 스킬 Briefing
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

// ════════════════════════════════════════════════════════════════════════════
// CognitiveBriefing — 메인 컴포넌트 (컨테이너)
// ════════════════════════════════════════════════════════════════════════════
export function CognitiveBriefing() {
  const {
    activeScore,
    activeSkill,
    customSkills,
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
  const detectedMeasureCount = segments.filter(seg => seg.measureCount).length;
  const selectedSegment = segments.find(seg => seg.id === selectedSegmentId) ?? null;
  const selectedSegmentIndex = segments.findIndex(seg => seg.id === selectedSegmentId);
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

  const mapSkillToSegment = useCallback((segmentId, skillId, meta) => {
    if (!segmentId || !skillId) return;
    segmentActs.mapSkillToSegment(segmentId, skillId, meta);
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

            {/* ── 증상 기반 스킬 매핑 ── */}
            <div className="mb-4" onClick={e => e.stopPropagation()}>
              <SkillMapperPanel
                selectedSegment={selectedSegment}
                segmentIndex={selectedSegmentIndex >= 0 ? selectedSegmentIndex : 0}
                mappedIds={selectedSegment?.mappedSkills ?? []}
                quickTraySkillIds={quickTraySkills}
                extraSkills={customSkills}
                onMap={mapSkillToSegment}
                onSetSymptomTags={segmentActs.setSegmentSymptomTags}
                onToggleQuickTray={cart.toggleQuickTraySkill}
                onRemoveQuickTray={cart.removeQuickTraySkill}
              />
            </div>

            {/* ── SEGMENT LIST ── */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className={[
                    'inline-block w-1.5 h-1.5 rounded-full',
                    isSelectingSegment ? 'bg-[var(--ivps-plum)] animate-pulse' : 'bg-[var(--ivps-plum)]',
                  ].join(' ')} />
                  구간별 스킬 매핑
                  {segments.length > 0 && (
                    <>
                      <span className="font-mono text-[9px] text-[var(--ivps-text4)] ml-1">({segments.length})</span>
                      <span className="px-1.5 py-0.5 rounded border border-[var(--ivps-border)] bg-[var(--ivps-bg)] text-[9px] text-[var(--ivps-text4)] normal-case tracking-normal">
                        {segments.length}개 중 {detectedMeasureCount}개 감지
                      </span>
                    </>
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
                      className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all bg-[var(--ivps-gold-bg)] border-[var(--ivps-gold-border)] text-[var(--ivps-gold)] hover:bg-[var(--ivps-active)]"
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
                      className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all bg-[var(--ivps-plum-bg)] border-[var(--ivps-plum-border)] text-[var(--ivps-plum)] hover:bg-[var(--ivps-hover)]"
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
                      'shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all animate-pulse hover:animate-none',
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
                    ? '증상을 고르면 추천 스킬을 이 구간에 바로 매핑합니다'
                    : '구간을 선택하면 증상 기반 추천이 시작됩니다'}
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
                    선택한 구간에 매핑된 스킬이 없습니다.<br />준비 탭에서 증상을 골라 추천 스킬을 매핑하세요.
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
