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
import { useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getCategoryMeta } from '../../data/taxonomy';
import { ScoreViewer } from '../score/ScoreViewer';
import { CognitiveBriefing } from '../phases/CognitiveBriefing';
import { PracticeHUD } from '../phases/PracticeHUD';
import { DiagnosticInterface } from '../phases/DiagnosticInterface';

// ── 위상(Phase) 메타 ──────────────────────────────────────────────────────
const PHASES = [
  { id: 'before', label: 'BEFORE', sub: '인지·준비',  color: '#7ea890' },
  { id: 'during', label: 'DURING', sub: '집중·HUD',   color: '#9b7fc8' },
  { id: 'after',  label: 'AFTER',  sub: '진단·처방',  color: '#e07070' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────────────────────────────────────────
function TopBar({ skill, score, phase, bpm, immersionMode, onBack, onPhaseChange, onToggleImmersion }) {
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

      {/* 몰입 모드 토글 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-[var(--ivps-text4)]">몰입</span>
        <button
          onClick={onToggleImmersion}
          className={[
            'w-[28px] h-[16px] rounded-full border relative transition-all flex-shrink-0',
            immersionMode
              ? 'bg-[rgba(212,168,67,.25)] border-[#d4a843]'
              : 'bg-[var(--ivps-surface2)] border-[var(--ivps-border2)]',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-[1px] w-[12px] h-[12px] rounded-full transition-all',
              immersionMode ? 'left-[13px] bg-[#d4a843]' : 'left-[1px] bg-[#4a5568]',
            ].join(' ')}
          />
        </button>
        <span className="font-mono text-[10px] text-[var(--ivps-text4)]">♩={bpm}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhasePanel — 우측 Phase 컴포넌트 래퍼
// ─────────────────────────────────────────────────────────────────────────────
function PhasePanel({ phase }) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--ivps-bg)]">
      {phase === 'before' && <CognitiveBriefing />}
      {phase === 'during' && <PracticeHUD />}
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
// CockpitView — 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
export function CockpitView() {
  const {
    phase,
    activeSkill,
    activeScore,
    bpm,
    immersionMode,
    practiceFullscreen,
    nav,
    ui,
  } = usePractice();

  const handleBack = useCallback(() => nav.navigate('library'), [nav]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* TopBar — 몰입 모드 시 숨김 */}
      {!immersionMode && (
        <TopBar
          skill={activeSkill}
          score={activeScore}
          phase={phase}
          bpm={bpm}
          immersionMode={immersionMode}
          onBack={handleBack}
          onPhaseChange={nav.setPhase}
          onToggleImmersion={ui.toggleImmersion}
        />
      )}

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

          {/* 전체화면 중 패널 복귀 버튼 */}
          {practiceFullscreen && (
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
            <PhasePanel phase={phase} />
          </div>
        )}

      </div>
    </div>
  );
}
