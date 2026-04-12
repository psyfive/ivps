// src/hooks/usePracticeSession.js
import { useReducer, useCallback, useRef } from 'react';
import { getSkillById } from '../data/taxonomy';

// ── 초기 상태 ──────────────────────────────────────────────────────────────
export const INITIAL_STATE = {
  // ─ 네비게이션 ─
  screen: 'dashboard',        // 'dashboard' | 'library' | 'cockpit'
  phase: 'before',            // 'before' | 'during' | 'after'

  // ─ 스킬 ─
  activeSkillId: null,        // 현재 연습 중인 스킬 ID
  selectedSkillId: null,      // 모달 등에서 선택된 스킬 ID (미리보기)
  filterCategory: '전체',     // 라이브러리 필터

  // ─ 악보 (Score) ─
  scores: [],                 // [{ id, name, dataUrl, uploadedAt, sessions, pageData, currentPageIndex }]
  activeScoreId: null,

  // ─ 세션 (Score 위 드래그 영역) ─
  activeSessionId: null,      // 선택된 세션 ID
  pickerSessionId: null,      // SkillPicker 모달 대상 세션 ID

  // ─ 메트로놈 ─
  bpm: 80,
  beatsPerBar: 4,
  metroPlaying: false,
  currentBeat: -1,

  // ─ 튜너 ─
  tunerActive: false,
  tunerNote: null,            // { name, cents, freq } | null

  // ─ 포도 체크 ─
  grapeTotal: 10,
  grapeFilled: 0,

  // ─ XP (세션 결과) ─
  xpLog: [],                  // [{ skillId, result, xp, timestamp }]

  // ─ UI ─
  immersionMode: false,
};

// ── 액션 타입 ──────────────────────────────────────────────────────────────
export const ACTIONS = {
  // 네비게이션
  SET_SCREEN:        'SET_SCREEN',
  SET_PHASE:         'SET_PHASE',

  // 스킬
  SET_ACTIVE_SKILL:  'SET_ACTIVE_SKILL',
  SET_SELECTED_SKILL:'SET_SELECTED_SKILL',
  SET_FILTER_CAT:    'SET_FILTER_CAT',

  // 악보
  ADD_SCORE:         'ADD_SCORE',
  SET_ACTIVE_SCORE:  'SET_ACTIVE_SCORE',
  DELETE_SCORE:      'DELETE_SCORE',
  RENAME_SCORE:      'RENAME_SCORE',
  CHANGE_PAGE:       'CHANGE_PAGE',

  // 세션
  ADD_SESSION:       'ADD_SESSION',
  DELETE_SESSION:    'DELETE_SESSION',
  SELECT_SESSION:    'SELECT_SESSION',
  ASSIGN_SKILL:      'ASSIGN_SKILL',
  REMOVE_SKILL:      'REMOVE_SKILL',
  TOGGLE_CHECK:      'TOGGLE_CHECK',
  SET_PICKER_SESSION:'SET_PICKER_SESSION',

  // 메트로놈
  SET_BPM:           'SET_BPM',
  SET_BEATS_PER_BAR: 'SET_BEATS_PER_BAR',
  SET_METRO_PLAYING: 'SET_METRO_PLAYING',
  SET_CURRENT_BEAT:  'SET_CURRENT_BEAT',

  // 튜너
  SET_TUNER_ACTIVE:  'SET_TUNER_ACTIVE',
  SET_TUNER_NOTE:    'SET_TUNER_NOTE',

  // 포도
  TOGGLE_GRAPE:      'TOGGLE_GRAPE',
  RESET_GRAPES:      'RESET_GRAPES',
  ADJUST_GRAPE_TOTAL:'ADJUST_GRAPE_TOTAL',

  // XP
  LOG_XP:            'LOG_XP',

  // UI
  TOGGLE_IMMERSION:  'TOGGLE_IMMERSION',
};

// ── 유틸 ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

function getActiveScore(state) {
  return state.scores.find(s => s.id === state.activeScoreId) ?? null;
}

function updateActiveScore(scores, activeScoreId, updater) {
  return scores.map(s =>
    s.id === activeScoreId ? { ...s, ...updater(s) } : s
  );
}

// ── Reducer ────────────────────────────────────────────────────────────────
export function reducer(state, action) {
  switch (action.type) {

    // ── 네비게이션 ──────────────────────────────────────────────────
    case ACTIONS.SET_SCREEN:
      return { ...state, screen: action.screen, selectedSkillId: null };

    case ACTIONS.SET_PHASE:
      return { ...state, phase: action.phase, activeSessionId: null };

    // ── 스킬 ────────────────────────────────────────────────────────
    case ACTIONS.SET_ACTIVE_SKILL:
      return {
        ...state,
        activeSkillId: action.skillId,
        screen: 'cockpit',
        phase: 'before',
        selectedSkillId: null,
      };

    case ACTIONS.SET_SELECTED_SKILL:
      return { ...state, selectedSkillId: action.skillId };

    case ACTIONS.SET_FILTER_CAT:
      return { ...state, filterCategory: action.category };

    // ── 악보 ────────────────────────────────────────────────────────
    case ACTIONS.ADD_SCORE: {
      const { name, pageData } = action;
      const score = {
        id: uid(),
        name,
        dataUrl: pageData[0].dataUrl,
        uploadedAt: Date.now(),
        sessions: [],
        pageData,
        currentPageIndex: 0,
      };
      return {
        ...state,
        scores: [score, ...state.scores],
        activeScoreId: score.id,
        screen: 'cockpit',
        phase: 'during',
      };
    }

    case ACTIONS.SET_ACTIVE_SCORE:
      return {
        ...state,
        activeScoreId: action.scoreId,
        screen: 'cockpit',
        phase: 'before',
        activeSessionId: null,
      };

    case ACTIONS.DELETE_SCORE: {
      const remaining = state.scores.filter(s => s.id !== action.scoreId);
      return {
        ...state,
        scores: remaining,
        activeScoreId: state.activeScoreId === action.scoreId
          ? (remaining[0]?.id ?? null)
          : state.activeScoreId,
      };
    }

    case ACTIONS.RENAME_SCORE:
      return {
        ...state,
        scores: updateActiveScore(state.scores, action.scoreId,
          () => ({ name: action.name })
        ),
      };

    case ACTIONS.CHANGE_PAGE: {
      const score = getActiveScore(state);
      if (!score?.pageData) return state;
      const newIdx = score.currentPageIndex + action.direction;
      if (newIdx < 0 || newIdx >= score.pageData.length) return state;

      // 현재 페이지 sessions/dataUrl 저장 후 새 페이지로 전환
      const updatedPageData = score.pageData.map((p, i) =>
        i === score.currentPageIndex
          ? { ...p, sessions: score.sessions, dataUrl: score.dataUrl }
          : p
      );
      const newPage = updatedPageData[newIdx];

      return {
        ...state,
        scores: state.scores.map(s =>
          s.id === state.activeScoreId
            ? {
                ...s,
                currentPageIndex: newIdx,
                pageData: updatedPageData,
                sessions: newPage.sessions ?? [],
                dataUrl: newPage.dataUrl,
              }
            : s
        ),
      };
    }

    // ── 세션 ────────────────────────────────────────────────────────
    case ACTIONS.ADD_SESSION: {
      const newSession = {
        id: uid(),
        rect: action.rect,   // { x, y, w, h } in %
        skills: [],
        checks: [],
      };
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          sessions: [...s.sessions, newSession],
        })),
        activeSessionId: newSession.id,
        pickerSessionId: newSession.id,
      };
    }

    case ACTIONS.DELETE_SESSION:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          sessions: s.sessions.filter(sess => sess.id !== action.sessionId),
        })),
        activeSessionId: state.activeSessionId === action.sessionId
          ? null : state.activeSessionId,
      };

    case ACTIONS.SELECT_SESSION:
      return {
        ...state,
        activeSessionId:
          state.activeSessionId === action.sessionId ? null : action.sessionId,
      };

    case ACTIONS.ASSIGN_SKILL:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          sessions: s.sessions.map(sess =>
            sess.id === action.sessionId && !sess.skills.includes(action.skillId)
              ? { ...sess, skills: [...sess.skills, action.skillId] }
              : sess
          ),
        })),
      };

    case ACTIONS.REMOVE_SKILL:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          sessions: s.sessions.map(sess =>
            sess.id === action.sessionId
              ? { ...sess, skills: sess.skills.filter(id => id !== action.skillId) }
              : sess
          ),
        })),
      };

    case ACTIONS.TOGGLE_CHECK: {
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== action.sessionId) return sess;
            const idx = sess.checks.indexOf(action.key);
            return {
              ...sess,
              checks: idx >= 0
                ? sess.checks.filter(k => k !== action.key)
                : [...sess.checks, action.key],
            };
          }),
        })),
      };
    }

    case ACTIONS.SET_PICKER_SESSION:
      return { ...state, pickerSessionId: action.sessionId };

    // ── 메트로놈 ─────────────────────────────────────────────────────
    case ACTIONS.SET_BPM:
      return { ...state, bpm: Math.max(20, Math.min(240, action.bpm)) };

    case ACTIONS.SET_BEATS_PER_BAR:
      return { ...state, beatsPerBar: action.beats };

    case ACTIONS.SET_METRO_PLAYING:
      return { ...state, metroPlaying: action.playing, currentBeat: action.playing ? state.currentBeat : -1 };

    case ACTIONS.SET_CURRENT_BEAT:
      return { ...state, currentBeat: action.beat };

    // ── 튜너 ─────────────────────────────────────────────────────────
    case ACTIONS.SET_TUNER_ACTIVE:
      return { ...state, tunerActive: action.active, tunerNote: action.active ? state.tunerNote : null };

    case ACTIONS.SET_TUNER_NOTE:
      return { ...state, tunerNote: action.note };

    // ── 포도 ─────────────────────────────────────────────────────────
    case ACTIONS.TOGGLE_GRAPE:
      return {
        ...state,
        grapeFilled: action.index < state.grapeFilled
          ? action.index
          : action.index + 1,
      };

    case ACTIONS.RESET_GRAPES:
      return { ...state, grapeFilled: 0 };

    case ACTIONS.ADJUST_GRAPE_TOTAL:
      return {
        ...state,
        grapeTotal: Math.max(1, Math.min(20, state.grapeTotal + action.delta)),
        grapeFilled: Math.min(state.grapeFilled, state.grapeTotal + action.delta),
      };

    // ── XP ───────────────────────────────────────────────────────────
    case ACTIONS.LOG_XP: {
      const xpMap = { success: 30, ok: 15, hard: 5 };
      const earned = xpMap[action.result] ?? 0;
      return {
        ...state,
        xpLog: [
          { skillId: action.skillId, result: action.result, xp: earned, timestamp: Date.now() },
          ...state.xpLog,
        ],
      };
    }

    // ── UI ───────────────────────────────────────────────────────────
    case ACTIONS.TOGGLE_IMMERSION:
      return { ...state, immersionMode: !state.immersionMode };

    default:
      return state;
  }
}

// ── 메인 훅 ───────────────────────────────────────────────────────────────
export function usePracticeSession() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // 편의 셀렉터
  const activeScore = state.scores.find(s => s.id === state.activeScoreId) ?? null;
  const activeSkill = getSkillById(state.activeSkillId);
  const selectedSkill = getSkillById(state.selectedSkillId);
  const activeSession = activeScore?.sessions.find(s => s.id === state.activeSessionId) ?? null;

  // ── 네비게이션 액션 ────────────────────────────────────────────────
  const navigate = useCallback((screen) =>
    dispatch({ type: ACTIONS.SET_SCREEN, screen }), []);

  const setPhase = useCallback((phase) =>
    dispatch({ type: ACTIONS.SET_PHASE, phase }), []);

  const goSkillPractice = useCallback((skillId) =>
    dispatch({ type: ACTIONS.SET_ACTIVE_SKILL, skillId }), []);

  const openSkillModal = useCallback((skillId) =>
    dispatch({ type: ACTIONS.SET_SELECTED_SKILL, skillId }), []);

  const closeSkillModal = useCallback(() =>
    dispatch({ type: ACTIONS.SET_SELECTED_SKILL, skillId: null }), []);

  const setFilterCategory = useCallback((category) =>
    dispatch({ type: ACTIONS.SET_FILTER_CAT, category }), []);

  // ── 악보 액션 ─────────────────────────────────────────────────────
  const addScore = useCallback((name, pageData) =>
    dispatch({ type: ACTIONS.ADD_SCORE, name, pageData }), []);

  const setActiveScore = useCallback((scoreId) =>
    dispatch({ type: ACTIONS.SET_ACTIVE_SCORE, scoreId }), []);

  const deleteScore = useCallback((scoreId) =>
    dispatch({ type: ACTIONS.DELETE_SCORE, scoreId }), []);

  const renameScore = useCallback((scoreId, name) =>
    dispatch({ type: ACTIONS.RENAME_SCORE, scoreId, name }), []);

  const changePage = useCallback((direction) =>
    dispatch({ type: ACTIONS.CHANGE_PAGE, direction }), []);

  // ── 세션 액션 ─────────────────────────────────────────────────────
  const addSession = useCallback((rect) =>
    dispatch({ type: ACTIONS.ADD_SESSION, rect }), []);

  const deleteSession = useCallback((sessionId) =>
    dispatch({ type: ACTIONS.DELETE_SESSION, sessionId }), []);

  const selectSession = useCallback((sessionId) =>
    dispatch({ type: ACTIONS.SELECT_SESSION, sessionId }), []);

  const assignSkill = useCallback((sessionId, skillId) =>
    dispatch({ type: ACTIONS.ASSIGN_SKILL, sessionId, skillId }), []);

  const removeSkill = useCallback((sessionId, skillId) =>
    dispatch({ type: ACTIONS.REMOVE_SKILL, sessionId, skillId }), []);

  const toggleCheck = useCallback((sessionId, key) =>
    dispatch({ type: ACTIONS.TOGGLE_CHECK, sessionId, key }), []);

  const openPicker = useCallback((sessionId) =>
    dispatch({ type: ACTIONS.SET_PICKER_SESSION, sessionId }), []);

  const closePicker = useCallback(() =>
    dispatch({ type: ACTIONS.SET_PICKER_SESSION, sessionId: null }), []);

  // ── 메트로놈 액션 ─────────────────────────────────────────────────
  const setBpm = useCallback((bpm) =>
    dispatch({ type: ACTIONS.SET_BPM, bpm: Number(bpm) }), []);

  const setMetroPlaying = useCallback((playing) =>
    dispatch({ type: ACTIONS.SET_METRO_PLAYING, playing }), []);

  const setCurrentBeat = useCallback((beat) =>
    dispatch({ type: ACTIONS.SET_CURRENT_BEAT, beat }), []);

  // ── 튜너 액션 ─────────────────────────────────────────────────────
  const setTunerActive = useCallback((active) =>
    dispatch({ type: ACTIONS.SET_TUNER_ACTIVE, active }), []);

  const setTunerNote = useCallback((note) =>
    dispatch({ type: ACTIONS.SET_TUNER_NOTE, note }), []);

  // ── 포도 액션 ─────────────────────────────────────────────────────
  const toggleGrape = useCallback((index) =>
    dispatch({ type: ACTIONS.TOGGLE_GRAPE, index }), []);

  const resetGrapes = useCallback(() =>
    dispatch({ type: ACTIONS.RESET_GRAPES }), []);

  const adjustGrapeTotal = useCallback((delta) =>
    dispatch({ type: ACTIONS.ADJUST_GRAPE_TOTAL, delta }), []);

  // ── XP 액션 ──────────────────────────────────────────────────────
  const logXp = useCallback((skillId, result) =>
    dispatch({ type: ACTIONS.LOG_XP, skillId, result }), []);

  // ── UI 액션 ──────────────────────────────────────────────────────
  const toggleImmersion = useCallback(() =>
    dispatch({ type: ACTIONS.TOGGLE_IMMERSION }), []);

  return {
    // 상태
    ...state,
    activeScore,
    activeSkill,
    selectedSkill,
    activeSession,

    // 액션 (그룹화)
    nav: { navigate, setPhase, goSkillPractice },
    skill: { openSkillModal, closeSkillModal, setFilterCategory },
    score: { addScore, setActiveScore, deleteScore, renameScore, changePage },
    session: { addSession, deleteSession, selectSession, assignSkill, removeSkill, toggleCheck, openPicker, closePicker },
    metro: { setBpm, setMetroPlaying, setCurrentBeat },
    tuner: { setTunerActive, setTunerNote },
    grape: { toggleGrape, resetGrapes, adjustGrapeTotal },
    xp: { logXp },
    ui: { toggleImmersion },
  };
}