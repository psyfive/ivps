// src/components/cockpit/CockpitView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 연습 조종석 — v3의 3단(좌사이드 + 메인 + 우사이드) 레이아웃 위에
// v4의 ScoreViewer(악보·드래그 세션)와 Phase 컴포넌트를 통합.
//
// 레이아웃:
//   [TopBar]
//   ─────────────────────────────────────────────────
//   [위상 탭 (Before | During | After)]
//   ─────────────────────────────────────────────────
//   [ScoreViewer (flex:1.7)] | [Phase 패널 (flex:1)]
//   ─────────────────────────────────────────────────
//
// Phase별 동작:
//   Before  → ScoreViewer(미리보기 모드) + CognitiveBriefing
//   During  → ScoreViewer(드래그 모드)   + PracticeHUD
//   After   → ScoreViewer(세션 클릭)     + DiagnosticInterface
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useState, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getCategoryMeta, getSkillById } from '../../data/taxonomy';
import { ScoreViewer } from '../score/ScoreViewer';
import { CognitiveBriefing } from '../phases/CognitiveBriefing';
import { PracticeHUD } from '../phases/PracticeHUD';
import { DiagnosticInterface } from '../phases/DiagnosticInterface';
import { DuringMiniControls } from '../phases/DuringMiniControls';
import { AfterBottomSheet } from './AfterBottomSheet';
import { FloatingDiagHandle } from './FloatingDiagHandle';

// ── 위상(Phase) 메타 ──────────────────────────────────────────────────────
const PHASES = [
  { id: 'before', label: 'BEFORE', sub: '인지·준비',  color: '#7ea890' },
  { id: 'during', label: 'DURING', sub: '집중·HUD',   color: '#9b7fc8' },
  { id: 'after',  label: 'AFTER',  sub: '진단·처방',  color: '#e07070' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────────────────────────────────────────
function TopBar({ skill, score, phase, bpm, onBack, onPhaseChange }) {
  const catMeta = skill ? getCategoryMeta(skill.id) : null;

  return (
    <div className="h-[44px] flex items-center gap-3 px-4 bg-[var(--ivps-nav)] border-b border-[var(--ivps-border)] flex-shrink-0">
      {/* 뒤로 가기 */}
      <button
        onClick={onBack}
        className="text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] text-[12px] flex items-center gap-1 px-2 py-1 rounded transition-colors flex-shrink-0"
      >
        ‹ 라이브러리
      </button>

      <div className="w-px h-3.5 bg-[var(--ivps-surface2)] flex-shrink-0" />

      {/* 스킬명 */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {skill && catMeta && (
          <span
            className="font-mono text-[11px] px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: `${catMeta.color}18`, color: catMeta.color }}
          >
            {skill.id}
          </span>
        )}
        <span className="font-serif text-[15px] font-semibold text-[var(--ivps-text1)] truncate">
          {skill?.name ?? (score?.name ?? '스킬 없음')}
        </span>
      </div>

      {/* Phase 탭 */}
      <div className="flex bg-[var(--ivps-bg)] border border-[var(--ivps-border)] rounded-[5px] p-[2px] gap-[1px] flex-shrink-0">
        {PHASES.map(p => (
          <button
            key={p.id}
            onClick={() => onPhaseChange(p.id)}
            className={[
              'px-3.5 py-[4px] rounded-[4px] text-[11px] font-medium flex flex-col items-center leading-none transition-all font-mono',
              phase === p.id
                ? 'bg-[var(--ivps-surface)] shadow-[0_1px_3px_rgba(0,0,0,.3)]'
                : 'text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
            ].join(' ')}
            style={phase === p.id ? { color: p.color } : {}}
          >
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* BPM 표시 */}
      <span className="font-mono text-[10px] text-[var(--ivps-text4)] flex-shrink-0">♩={bpm}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhasePanel — 우측 Phase 컴포넌트 래퍼
// ─────────────────────────────────────────────────────────────────────────────
function PhasePanel({ phase, onOpenAfterSheet }) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--ivps-bg)]">
      {phase === 'before' && <CognitiveBriefing />}
      {phase === 'during' && <PracticeHUD onOpenAfterSheet={onOpenAfterSheet} />}
      {phase === 'after'  && <DiagnosticInterface />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptySkillBanner — 스킬 미선택 시 ScoreViewer 위에 안내 배너
// ─────────────────────────────────────────────────────────────────────────────
function EmptySkillBanner({ onGoLibrary }) {
  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-3 px-4 py-2.5 bg-[rgba(212,168,67,.08)] border border-[rgba(212,168,67,.22)] rounded-lg">
      <span className="text-[12px] text-[var(--ivps-gold)]">
        스킬을 선택하지 않았습니다. 라이브러리에서 먼저 스킬을 선택하세요.
      </span>
      <button
        onClick={onGoLibrary}
        className="ml-auto text-[11px] text-[var(--ivps-gold)] border border-[rgba(212,168,67,.3)] px-2.5 py-1 rounded hover:bg-[rgba(212,168,67,.1)] transition-colors flex-shrink-0"
      >
        라이브러리 가기
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FloatingSegmentHUD — 전체화면 During 모드 전용 플로팅 HUD 카드
// ─────────────────────────────────────────────────────────────────────────────
function FloatingSegmentHUD({ segment, segmentIndex, onClose }) {
  const { bpm } = usePractice();
  const skills = (segment?.mappedSkills ?? []).map(id => getSkillById(id)).filter(Boolean);
  const [skillIdx, setSkillIdx] = useState(0);
  const [checked, setChecked] = useState(new Set());
  const [streak, setStreak] = useState(0);

  useEffect(() => { setSkillIdx(0); setChecked(new Set()); }, [segment?.id]);
  useEffect(() => { setChecked(new Set()); }, [skillIdx]);

  const skill = skills[skillIdx] ?? null;
  const catMeta = skill ? getCategoryMeta(skill.id) : null;
  const items = skill?.during ?? [];
  const allChecked = items.length > 0 && checked.size >= items.length;

  const toggle = (i) => setChecked(prev => {
    const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next;
  });

  return (
    <div
      className="absolute top-4 right-4 z-30 w-72 rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        background: 'rgba(13,17,23,0.92)',
        borderColor: 'rgba(155,127,200,0.35)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(155,127,200,.2)]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--ivps-plum)] bg-[rgba(155,127,200,.15)] px-2 py-0.5 rounded-md font-semibold">
            {segmentIndex + 1}구간
          </span>
          {skills.length > 1 && (
            <div className="flex gap-1">
              {skills.map((sk, i) => {
                const meta = getCategoryMeta(sk.id);
                return (
                  <button
                    key={sk.id}
                    onClick={() => setSkillIdx(i)}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded border transition-all"
                    style={i === skillIdx
                      ? { background: `${meta.color}20`, color: meta.color, borderColor: `${meta.color}50` }
                      : { background: 'transparent', color: '#6b7280', borderColor: 'rgba(107,114,128,.3)' }
                    }
                  >
                    {sk.id}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[var(--ivps-text4)] hover:text-[var(--ivps-text2)] text-[14px] transition-colors"
        >
          ×
        </button>
      </div>

      {/* 스킬 이름 */}
      {skill && (
        <div className="px-4 py-2 border-b border-[rgba(155,127,200,.12)]">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[9.5px] px-1 py-0.5 rounded"
              style={{ background: `${catMeta?.color}18`, color: catMeta?.color }}
            >
              {skill.id}
            </span>
            <span className="text-[12.5px] font-semibold text-[var(--ivps-text1)]">{skill.name}</span>
            {streak > 0 && (
              <span className="ml-auto text-[10px] text-[var(--ivps-gold)] font-mono">🔥×{streak}</span>
            )}
          </div>
        </div>
      )}

      {/* 체크포인트 */}
      <div className="px-4 py-3 max-h-52 overflow-y-auto">
        {items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {items.map((text, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={[
                  'flex items-start gap-2.5 text-left w-full rounded-lg px-2.5 py-2 border transition-all text-[12px]',
                  checked.has(i)
                    ? 'border-[rgba(155,127,200,.4)] bg-[rgba(155,127,200,.12)] line-through opacity-60'
                    : i === 0
                    ? 'border-[rgba(155,127,200,.25)] bg-[rgba(155,127,200,.07)] font-semibold text-[var(--ivps-text1)]'
                    : 'border-[rgba(255,255,255,.06)] bg-[rgba(255,255,255,.03)] text-[#c8d0dc]',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5',
                    checked.has(i)
                      ? 'bg-[#9b7fc8] text-white'
                      : 'bg-[rgba(155,127,200,.2)] text-[var(--ivps-plum)]',
                  ].join(' ')}
                >
                  {checked.has(i) ? '✓' : i + 1}
                </span>
                {text}
              </button>
            ))}
          </div>
        ) : skills.length === 0 ? (
          <p className="text-[11px] text-[var(--ivps-text4)] text-center py-2">
            이 구간에 매핑된 스킬이 없습니다.
          </p>
        ) : (
          <p className="text-[11px] text-[var(--ivps-text4)] text-center py-2">
            체크포인트 데이터 없음
          </p>
        )}
      </div>

      {/* 결과 버튼 */}
      {items.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-3 gap-1.5">
          {[['🎯', '완벽', '#7ea890'], ['😐', '보통', '#d4a843'], ['😣', '어려움', '#e07070']].map(([icon, label, col]) => (
            <button
              key={label}
              onClick={() => {
                if (label === '완벽') setStreak(s => s + 1); else setStreak(0);
                setChecked(new Set());
              }}
              className="py-2 rounded-lg text-[11px] font-medium border transition-all hover:scale-[1.03]"
              style={{ background: `${col}12`, borderColor: `${col}30`, color: col }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CockpitView — 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
export function CockpitView() {
  const {
    phase,
    activeSkill,
    activeScore,
    bpm,
    practiceFullscreen,
    selectedSegmentId,
    nav,
    ui,
    segment: segmentActs,
  } = usePractice();

  const segments = activeScore?.segments ?? [];
  const selectedSegment = segments.find(s => s.id === selectedSegmentId) ?? null;
  const selectedSegmentIndex = segments.findIndex(s => s.id === selectedSegmentId);

  const handleBack = useCallback(() => nav.navigate('library'), [nav]);

  const [afterSheetOpen, setAfterSheetOpen] = useState(false);

  // During Phase 이탈 시 시트 자동 닫기
  useEffect(() => {
    if (phase !== 'during') setAfterSheetOpen(false);
  }, [phase]);

  // 비전체화면에서 CTA 클릭 시 전체화면 전환 + 시트 열기
  const handleOpenAfterSheet = useCallback(() => {
    ui.setPracticeFullscreen(true);
    setAfterSheetOpen(true);
  }, [ui]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <TopBar
        skill={activeSkill}
        score={activeScore}
        phase={phase}
        bpm={bpm}
        onBack={handleBack}
        onPhaseChange={nav.setPhase}
      />

      {/* 본문 — ScoreViewer(좌) + PhasePanel(우) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── 악보 영역 ── */}
        <div
          className={[
            'relative flex flex-col overflow-hidden',
            practiceFullscreen ? '' : 'border-r border-[var(--ivps-border)]',
          ].join(' ')}
          style={{ flex: practiceFullscreen ? '1' : '1.7' }}
        >
          {/* 스킬 없음 배너 */}
          {!activeSkill && (
            <EmptySkillBanner onGoLibrary={handleBack} />
          )}

          {/* ScoreViewer */}
          <ScoreViewer phase={phase} />

          {/* 전체화면 During: 하단 미니 컨트롤 바 */}
          {practiceFullscreen && phase === 'during' && (
            <DuringMiniControls onOpenPanel={() => ui.setPracticeFullscreen(false)} />
          )}

          {/* During 전체화면: 플로팅 진단 핸들 (시트 닫혀있을 때만 표시) */}
          {practiceFullscreen && phase === 'during' && !afterSheetOpen && (
            <FloatingDiagHandle
              onClick={() => setAfterSheetOpen(true)}
              skillLabel={selectedSegment?.mappedSkills?.[0] ?? null}
            />
          )}

          {/* During 전체화면: After Bottom Sheet 오버레이 */}
          {practiceFullscreen && phase === 'during' && (
            <AfterBottomSheet
              isOpen={afterSheetOpen}
              onClose={() => setAfterSheetOpen(false)}
            />
          )}

          {/* 전체화면 중 패널 복귀 버튼 — During 이외 페이즈 */}
          {practiceFullscreen && phase !== 'during' && (
            <button
              onClick={() => ui.setPracticeFullscreen(false)}
              className={[
                'absolute bottom-5 right-5 z-30',
                'flex items-center gap-1.5 px-3 py-2 rounded-lg',
                'text-[11.5px] font-semibold border backdrop-blur-sm shadow-lg',
                'bg-[rgba(13,17,23,0.75)] border-[rgba(155,127,200,0.4)]',
                'text-[#9b7fc8] hover:bg-[rgba(155,127,200,0.15)] hover:border-[rgba(155,127,200,0.65)]',
                'transition-all',
              ].join(' ')}
              title="패널 열기"
            >
              <span className="text-[13px] leading-none">◧</span>
              패널 열기
            </button>
          )}
        </div>

        {/* ── Phase 패널 — 전체화면 시 숨김 ── */}
        {!practiceFullscreen && (
          <div className="flex flex-col overflow-hidden" style={{ flex: '1', minWidth: 0 }}>
            <PhasePanel phase={phase} onOpenAfterSheet={handleOpenAfterSheet} />
          </div>
        )}

      </div>
    </div>
  );
}
