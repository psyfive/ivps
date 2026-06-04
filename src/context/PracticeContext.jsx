import { createContext, useContext, useMemo } from 'react';
import { usePracticeSession } from '../hooks/usePracticeSession';

// ── 3개 슬라이스 컨텍스트 ────────────────────────────────────────────────────
// MetroCtx  : bpm·beatsPerBar·metroPlaying·currentBeat·subdivision·ghostTrain + metro 액션
// TunerCtx  : tunerActive·tunerNote + tuner 액션
// PracticeCtx: 나머지 모든 상태·파생값·액션
//
// currentBeat는 메트로놈 틱마다, tunerNote는 오디오 분석 프레임마다 변경된다.
// 이 둘을 별도 컨텍스트로 격리해 PracticeCtx 구독자가 불필요하게 재렌더링되지 않도록 한다.

const MetroCtx = createContext(null);
const TunerCtx = createContext(null);
const PracticeCtx = createContext(null);

export function PracticeProvider({ children }) {
  const s = usePracticeSession();

  // ── Metro 슬라이스 ──────────────────────────────────────────────────────────
  const metroValue = useMemo(() => ({
    bpm: s.bpm,
    beatsPerBar: s.beatsPerBar,
    metroPlaying: s.metroPlaying,
    currentBeat: s.currentBeat,
    subdivision: s.subdivision,
    ghostTrainBars: s.ghostTrainBars,
    ghostTrainReadyBars: s.ghostTrainReadyBars,
    metro: s.metro,
  }), [
    s.bpm, s.beatsPerBar, s.metroPlaying, s.currentBeat, s.subdivision,
    s.ghostTrainBars, s.ghostTrainReadyBars, s.metro,
  ]);

  // ── Tuner 슬라이스 ──────────────────────────────────────────────────────────
  const tunerValue = useMemo(() => ({
    tunerActive: s.tunerActive,
    tunerNote: s.tunerNote,
    tuner: s.tuner,
  }), [s.tunerActive, s.tunerNote, s.tuner]);

  // ── Practice 슬라이스 (나머지) ─────────────────────────────────────────────
  const practiceValue = useMemo(() => ({
    screen: s.screen,
    phase: s.phase,
    activeSkillId: s.activeSkillId,
    selectedSkillId: s.selectedSkillId,
    customSkills: s.customSkills,
    customSkillStatus: s.customSkillStatus,
    customSkillError: s.customSkillError,
    scores: s.scores,
    activeScoreId: s.activeScoreId,
    activeScore: s.activeScore,
    activeSkill: s.activeSkill,
    selectedSkill: s.selectedSkill,
    activeSessionId: s.activeSessionId,
    activeSession: s.activeSession,
    pickerSessionId: s.pickerSessionId,
    grapeTotal: s.grapeTotal,
    grapeFilled: s.grapeFilled,
    grapeBpmIncrement: s.grapeBpmIncrement,
    xpLog: s.xpLog,
    quickTraySkills: s.quickTraySkills,
    isSelectingSegment: s.isSelectingSegment,
    selectedSegmentId: s.selectedSegmentId,
    selectedSegment: s.selectedSegment,
    addingToSegmentId: s.addingToSegmentId,
    tempSegments: s.tempSegments,
    drawingMode: s.drawingMode,
    drawingTool: s.drawingTool,
    drawingColor: s.drawingColor,
    drawingFontSize: s.drawingFontSize,
    drawingBowingSize: s.drawingBowingSize,
    practiceFullscreen: s.practiceFullscreen,
    duringChecklistMode: s.duringChecklistMode,
    duringChecklistBubblePositions: s.duringChecklistBubblePositions,
    reviewSegmentIndex: s.reviewSegmentIndex,
    practiceSessions: s.practiceSessions,
    duringStartTime: s.duringStartTime,
    practiceFlowMode: s.practiceFlowMode,
    interleaveHistory: s.interleaveHistory,
    reviewReminders: s.reviewReminders,
    isPatron: s.isPatron,
    activeInstrument: s.activeInstrument,
    symptomFilter: s.symptomFilter,
    allSkills: s.allSkills,
    resolveSkillById: s.resolveSkillById,
    nav: s.nav,
    skill: s.skill,
    customSkill: s.customSkill,
    taxonomy: s.taxonomy,
    score: s.score,
    session: s.session,
    cart: s.cart,
    segment: s.segment,
    practiceFlow: s.practiceFlow,
    review: s.review,
    drawing: s.drawing,
    grape: s.grape,
    settings: s.settings,
    xp: s.xp,
    ui: s.ui,
  }), [
    s.screen, s.phase, s.activeSkillId, s.selectedSkillId,
    s.customSkills, s.customSkillStatus, s.customSkillError,
    s.scores, s.activeScoreId, s.activeScore, s.activeSkill, s.selectedSkill,
    s.activeSessionId, s.activeSession, s.pickerSessionId,
    s.grapeTotal, s.grapeFilled, s.grapeBpmIncrement,
    s.xpLog, s.quickTraySkills,
    s.isSelectingSegment, s.selectedSegmentId, s.selectedSegment,
    s.addingToSegmentId, s.tempSegments,
    s.drawingMode, s.drawingTool, s.drawingColor, s.drawingFontSize, s.drawingBowingSize,
    s.practiceFullscreen, s.duringChecklistMode, s.duringChecklistBubblePositions,
    s.reviewSegmentIndex, s.practiceSessions, s.duringStartTime,
    s.practiceFlowMode, s.interleaveHistory, s.reviewReminders,
    s.isPatron, s.activeInstrument, s.symptomFilter,
    s.allSkills, s.resolveSkillById,
    // 메모이제이션된 네임스페이스 — currentBeat/tunerNote 변화 시 불변
    s.nav, s.skill, s.customSkill, s.taxonomy,
    s.score, s.session, s.cart, s.segment,
    s.practiceFlow, s.review, s.drawing,
    s.grape, s.settings, s.xp, s.ui,
  ]);

  return (
    <MetroCtx.Provider value={metroValue}>
      <TunerCtx.Provider value={tunerValue}>
        <PracticeCtx.Provider value={practiceValue}>
          {children}
        </PracticeCtx.Provider>
      </TunerCtx.Provider>
    </MetroCtx.Provider>
  );
}

export function usePractice() {
  const ctx = useContext(PracticeCtx);
  if (!ctx) throw new Error('usePractice must be used within PracticeProvider');
  return ctx;
}

export function useMetro() {
  const ctx = useContext(MetroCtx);
  if (!ctx) throw new Error('useMetro must be used within PracticeProvider');
  return ctx;
}

export function useTuner() {
  const ctx = useContext(TunerCtx);
  if (!ctx) throw new Error('useTuner must be used within PracticeProvider');
  return ctx;
}
