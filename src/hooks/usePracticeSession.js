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

  // ─ 포도송이 체크 ─
  grapeTotal: 10,
  grapeFilled: 0,
  grapeBpmIncrement: 2,   // 포도 하나 체크 시 BPM 증가량

  // ─ XP (세션 결과) ─
  xpLog: [],                  // [{ skillId, result, xp, timestamp }]

  // ─ Skill Cart (Before Phase) ─
  skillCart: [],              // string[] — 오늘 연습에 사용할 스킬 ID 목록

  // ─ 시각적 구간 선택 모드 ─
  isSelectingSegment: false,  // 캔버스 드래그 구간 생성 모드
  selectedSegmentId: null,    // 선택된 구간 ID
  addingToSegmentId: null,    // 기존 구간에 박스 추가 중일 때 대상 구간 ID
  tempSegments: [],           // 미확정 구간 버퍼 [{id, coordinates, mappedSkills}]

  // ─ 현재 마디 (During Phase 연동) ─
  currentBar: null,           // number | null

  // ─ UI ─
  immersionMode: false,
  practiceFullscreen: false, // During 진입 시 양 사이드 패널 접기
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

  // 포도송이
  TOGGLE_GRAPE:            'TOGGLE_GRAPE',
  RESET_GRAPES:            'RESET_GRAPES',
  ADJUST_GRAPE_TOTAL:      'ADJUST_GRAPE_TOTAL',
  SET_GRAPE_BPM_INCREMENT: 'SET_GRAPE_BPM_INCREMENT',

  // XP
  LOG_XP:            'LOG_XP',

  // Skill Cart
  ADD_TO_CART:       'ADD_TO_CART',
  REMOVE_FROM_CART:  'REMOVE_FROM_CART',

  // 시각적 구간 (Before Phase 드래그 매핑)
  TOGGLE_SEGMENT_MODE:     'TOGGLE_SEGMENT_MODE',
  START_ADD_TO_SEGMENT:    'START_ADD_TO_SEGMENT',
  SELECT_SEGMENT:          'SELECT_SEGMENT',
  ADD_SEGMENT:             'ADD_SEGMENT',
  DELETE_SEGMENT:          'DELETE_SEGMENT',
  DELETE_SEGMENT_COORD:    'DELETE_SEGMENT_COORD',
  UPDATE_SEGMENT_COORD:    'UPDATE_SEGMENT_COORD',
  MAP_SKILL_TO_SEGMENT:    'MAP_SKILL_TO_SEGMENT',
  UNMAP_SKILL_FROM_SEGMENT:'UNMAP_SKILL_FROM_SEGMENT',
  // 임시 구간 버퍼 (드래그 완료 → 확정 전 대기)
  ADD_TEMP_SEGMENT:        'ADD_TEMP_SEGMENT',
  DELETE_TEMP_SEGMENT:     'DELETE_TEMP_SEGMENT',
  COMMIT_TEMP_SEGMENTS:    'COMMIT_TEMP_SEGMENTS',

  // Sections (Before Phase 마디 매핑)
  ADD_SECTION:          'ADD_SECTION',
  DELETE_SECTION:       'DELETE_SECTION',
  ASSIGN_SECTION_SKILL: 'ASSIGN_SECTION_SKILL',

  // 현재 마디 (During Phase)
  SET_CURRENT_BAR:   'SET_CURRENT_BAR',

  // UI
  TOGGLE_IMMERSION:       'TOGGLE_IMMERSION',
  SET_PRACTICE_FULLSCREEN:'SET_PRACTICE_FULLSCREEN',
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
      return {
        ...state,
        phase: action.phase,
        activeSessionId: null,
        // During이 아닌 phase로 전환 시 fullscreen 자동 해제
        practiceFullscreen: action.phase === 'during' ? state.practiceFullscreen : false,
      };

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
      // 각 페이지에 sessions 슬롯 보장 (segments는 score 레벨 — 페이지별 저장 불필요)
      const normalizedPageData = pageData.map(p => ({ sessions: [], ...p }));
      const score = {
        id: uid(),
        name,
        dataUrl: normalizedPageData[0].dataUrl,
        uploadedAt: Date.now(),
        sessions: [],
        sections: [],
        segments: [],
        pageData: normalizedPageData,
        currentPageIndex: 0,
      };
      return {
        ...state,
        scores: [score, ...state.scores],
        activeScoreId: score.id,
        screen: 'cockpit',
        phase: 'before',
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

      // 현재 페이지 sessions 저장 후 새 페이지로 전환
      // segments는 score 레벨 — pageIndex 필드로 페이지 구분, 페이지 전환 시 보존
      // isSelectingSegment / tempSegments도 유지 — 크로스 페이지 구간 설정 허용
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

    // ── 포도송이 ──────────────────────────────────────────────────────
    case ACTIONS.TOGGLE_GRAPE: {
      const isChecking = action.index >= state.grapeFilled;
      return {
        ...state,
        grapeFilled: isChecking ? action.index + 1 : action.index,
        // 체크 시에만 BPM 증가 (해제 시 BPM 유지)
        bpm: isChecking
          ? Math.min(240, state.bpm + state.grapeBpmIncrement)
          : state.bpm,
      };
    }

    case ACTIONS.RESET_GRAPES:
      return { ...state, grapeFilled: 0 };

    case ACTIONS.ADJUST_GRAPE_TOTAL:
      return {
        ...state,
        grapeTotal: Math.max(1, Math.min(20, state.grapeTotal + action.delta)),
        grapeFilled: Math.min(state.grapeFilled, state.grapeTotal + action.delta),
      };

    case ACTIONS.SET_GRAPE_BPM_INCREMENT:
      return {
        ...state,
        grapeBpmIncrement: Math.max(0, Math.min(20, action.value)),
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

    // ── 시각적 구간 ───────────────────────────────────────────────────
    case ACTIONS.TOGGLE_SEGMENT_MODE:
      // 모드 종료 시 미확정 버퍼를 초기화 (확정 없이 취소)
      return {
        ...state,
        isSelectingSegment: !state.isSelectingSegment,
        selectedSegmentId: null,
        addingToSegmentId: null,
        tempSegments: state.isSelectingSegment ? [] : state.tempSegments,
      };

    case ACTIONS.START_ADD_TO_SEGMENT:
      // 선택된 기존 구간에 박스 추가 모드 진입
      return {
        ...state,
        isSelectingSegment: true,
        addingToSegmentId: action.segmentId,
        tempSegments: [],
      };

    case ACTIONS.SELECT_SEGMENT:
      return { ...state, selectedSegmentId: action.segmentId };

    case ACTIONS.ADD_SEGMENT: {
      // coordinates: 단일 rect 또는 rect[] — 항상 배열로 저장
      const coordsArr = Array.isArray(action.coordinates)
        ? action.coordinates
        : [action.coordinates];
      const newSegment = {
        id: uid(),
        coordinates: coordsArr, // [{ x, y, width, height }, ...] — 0~1 상대 좌표
        measures: { start: null, end: null },
        mappedSkills: [],
      };
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: [...(s.segments ?? []), newSegment],
        })),
        selectedSegmentId: newSegment.id,
      };
    }

    // ── 임시 구간 버퍼 ────────────────────────────────────────────────
    case ACTIONS.ADD_TEMP_SEGMENT: {
      const tmp = {
        id: `tmp-${uid()}`,
        coordinates: action.coordinates, // 단일 rect {x,y,width,height}
        mappedSkills: [],
      };
      return { ...state, tempSegments: [...state.tempSegments, tmp] };
    }

    case ACTIONS.DELETE_TEMP_SEGMENT:
      return {
        ...state,
        tempSegments: state.tempSegments.filter(s => s.id !== action.id),
      };

    case ACTIONS.COMMIT_TEMP_SEGMENTS: {
      if (state.tempSegments.length === 0) {
        // 버퍼가 비어있으면 모드만 종료
        return {
          ...state,
          isSelectingSegment: false,
          addingToSegmentId: null,
        };
      }

      const allCoords = state.tempSegments.map(t => t.coordinates);

      // 기존 구간에 박스 추가 모드
      if (state.addingToSegmentId) {
        return {
          ...state,
          tempSegments: [],
          isSelectingSegment: false,
          addingToSegmentId: null,
          scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
            segments: (s.segments ?? []).map(seg =>
              seg.id === state.addingToSegmentId
                ? { ...seg, coordinates: [...seg.coordinates, ...allCoords] }
                : seg
            ),
          })),
          selectedSegmentId: state.addingToSegmentId,
        };
      }

      // 신규 구간 생성 (기본 동작)
      const newSeg = {
        id: uid(),
        coordinates: allCoords,
        measures: { start: null, end: null },
        mappedSkills: [],
      };
      return {
        ...state,
        tempSegments: [],
        isSelectingSegment: false,
        addingToSegmentId: null,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: [...(s.segments ?? []), newSeg],
        })),
        selectedSegmentId: newSeg.id,
      };
    }

    case ACTIONS.DELETE_SEGMENT:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).filter(seg => seg.id !== action.segmentId),
        })),
        selectedSegmentId:
          state.selectedSegmentId === action.segmentId ? null : state.selectedSegmentId,
      };

    case ACTIONS.DELETE_SEGMENT_COORD: {
      const { segmentId, coordIndex } = action;
      const segs = (
        (state.scores.find(sc => sc.id === state.activeScoreId)?.segments) ?? []
      );
      const targetSeg = segs.find(s => s.id === segmentId);
      // 좌표가 1개뿐이면 구간 전체 삭제
      if (!targetSeg || targetSeg.coordinates.length <= 1) {
        return {
          ...state,
          scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
            segments: (s.segments ?? []).filter(seg => seg.id !== segmentId),
          })),
          selectedSegmentId:
            state.selectedSegmentId === segmentId ? null : state.selectedSegmentId,
        };
      }
      // 해당 좌표만 제거
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === segmentId
              ? { ...seg, coordinates: seg.coordinates.filter((_, i) => i !== coordIndex) }
              : seg
          ),
        })),
      };
    }

    case ACTIONS.UPDATE_SEGMENT_COORD: {
      const { segmentId, coordIndex, coord } = action;
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === segmentId
              ? {
                  ...seg,
                  coordinates: seg.coordinates.map((c, i) =>
                    i === coordIndex ? { ...c, ...coord } : c
                  ),
                }
              : seg
          ),
        })),
      };
    }

    case ACTIONS.MAP_SKILL_TO_SEGMENT:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === action.segmentId && !seg.mappedSkills.includes(action.skillId)
              ? { ...seg, mappedSkills: [...seg.mappedSkills, action.skillId] }
              : seg
          ),
        })),
      };

    case ACTIONS.UNMAP_SKILL_FROM_SEGMENT:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === action.segmentId
              ? { ...seg, mappedSkills: seg.mappedSkills.filter(id => id !== action.skillId) }
              : seg
          ),
        })),
      };

    // ── Skill Cart ────────────────────────────────────────────────────
    case ACTIONS.ADD_TO_CART:
      if (state.skillCart.includes(action.skillId)) return state;
      return { ...state, skillCart: [...state.skillCart, action.skillId] };

    case ACTIONS.REMOVE_FROM_CART:
      return { ...state, skillCart: state.skillCart.filter(id => id !== action.skillId) };

    // ── Sections (마디 매핑) ──────────────────────────────────────────
    case ACTIONS.ADD_SECTION: {
      const newSection = {
        id: uid(),
        range: action.range,         // [startBar, endBar]
        activeSkillId: null,
        p2_data: [],
      };
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => {
          // replaceId가 있으면 기존 겹침 구간 삭제 후 추가
          const base = action.replaceId
            ? (s.sections ?? []).filter(sec => sec.id !== action.replaceId)
            : (s.sections ?? []);
          return { sections: [...base, newSection] };
        }),
      };
    }

    case ACTIONS.DELETE_SECTION:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          sections: (s.sections ?? []).filter(sec => sec.id !== action.sectionId),
        })),
      };

    case ACTIONS.ASSIGN_SECTION_SKILL:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          sections: (s.sections ?? []).map(sec =>
            sec.id === action.sectionId
              ? { ...sec, activeSkillId: action.skillId, p2_data: action.p2Data }
              : sec
          ),
        })),
      };

    // ── 현재 마디 ─────────────────────────────────────────────────────
    case ACTIONS.SET_CURRENT_BAR:
      return { ...state, currentBar: action.bar };

    // ── UI ───────────────────────────────────────────────────────────
    case ACTIONS.TOGGLE_IMMERSION:
      return { ...state, immersionMode: !state.immersionMode };

    case ACTIONS.SET_PRACTICE_FULLSCREEN:
      return { ...state, practiceFullscreen: action.value };

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
  const currentSection = getSectionByBar(activeScore?.sections, state.currentBar);

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

  const setGrapeBpmIncrement = useCallback((value) =>
    dispatch({ type: ACTIONS.SET_GRAPE_BPM_INCREMENT, value: Number(value) }), []);

  // ── XP 액션 ──────────────────────────────────────────────────────
  const logXp = useCallback((skillId, result) =>
    dispatch({ type: ACTIONS.LOG_XP, skillId, result }), []);

  // ── 시각적 구간 액션 ─────────────────────────────────────────────
  const toggleSegmentMode = useCallback(() =>
    dispatch({ type: ACTIONS.TOGGLE_SEGMENT_MODE }), []);

  const selectSegment = useCallback((segmentId) =>
    dispatch({ type: ACTIONS.SELECT_SEGMENT, segmentId }), []);

  const addSegment = useCallback((coordinates) =>
    dispatch({ type: ACTIONS.ADD_SEGMENT, coordinates }), []);

  const deleteSegment = useCallback((segmentId) =>
    dispatch({ type: ACTIONS.DELETE_SEGMENT, segmentId }), []);

  const deleteSegmentCoord = useCallback((segmentId, coordIndex) =>
    dispatch({ type: ACTIONS.DELETE_SEGMENT_COORD, segmentId, coordIndex }), []);

  const startAddToSegment = useCallback((segmentId) =>
    dispatch({ type: ACTIONS.START_ADD_TO_SEGMENT, segmentId }), []);

  const updateSegmentCoord = useCallback((segmentId, coordIndex, coord) =>
    dispatch({ type: ACTIONS.UPDATE_SEGMENT_COORD, segmentId, coordIndex, coord }), []);

  const mapSkillToSegment = useCallback((segmentId, skillId) =>
    dispatch({ type: ACTIONS.MAP_SKILL_TO_SEGMENT, segmentId, skillId }), []);

  const unmapSkillFromSegment = useCallback((segmentId, skillId) =>
    dispatch({ type: ACTIONS.UNMAP_SKILL_FROM_SEGMENT, segmentId, skillId }), []);

  const addTempSegment = useCallback((coordinates) =>
    dispatch({ type: ACTIONS.ADD_TEMP_SEGMENT, coordinates }), []);

  const deleteTempSegment = useCallback((id) =>
    dispatch({ type: ACTIONS.DELETE_TEMP_SEGMENT, id }), []);

  const commitTempSegments = useCallback(() =>
    dispatch({ type: ACTIONS.COMMIT_TEMP_SEGMENTS }), []);

  // ── Skill Cart 액션 ──────────────────────────────────────────────
  const addToCart = useCallback((skillId) =>
    dispatch({ type: ACTIONS.ADD_TO_CART, skillId }), []);

  const removeFromCart = useCallback((skillId) =>
    dispatch({ type: ACTIONS.REMOVE_FROM_CART, skillId }), []);

  // ── Section 액션 ─────────────────────────────────────────────────
  const addSection = useCallback((range, replaceId = null) =>
    dispatch({ type: ACTIONS.ADD_SECTION, range, replaceId }), []);

  const deleteSection = useCallback((sectionId) =>
    dispatch({ type: ACTIONS.DELETE_SECTION, sectionId }), []);

  const assignSectionSkill = useCallback((sectionId, skillId, p2Data) =>
    dispatch({ type: ACTIONS.ASSIGN_SECTION_SKILL, sectionId, skillId, p2Data }), []);

  const setCurrentBar = useCallback((bar) =>
    dispatch({ type: ACTIONS.SET_CURRENT_BAR, bar }), []);

  // ── UI 액션 ──────────────────────────────────────────────────────
  const toggleImmersion = useCallback(() =>
    dispatch({ type: ACTIONS.TOGGLE_IMMERSION }), []);

  const setPracticeFullscreen = useCallback((value) =>
    dispatch({ type: ACTIONS.SET_PRACTICE_FULLSCREEN, value }), []);

  return {
    // 상태
    ...state,
    activeScore,
    activeSkill,
    selectedSkill,
    activeSession,
    currentSection,

    // 액션 (그룹화)
    nav: { navigate, setPhase, goSkillPractice },
    skill: { openSkillModal, closeSkillModal, setFilterCategory },
    score: { addScore, setActiveScore, deleteScore, renameScore, changePage },
    session: { addSession, deleteSession, selectSession, assignSkill, removeSkill, toggleCheck, openPicker, closePicker },
    cart: { addToCart, removeFromCart },
    segment: { toggleSegmentMode, startAddToSegment, selectSegment, addSegment, deleteSegment, deleteSegmentCoord, updateSegmentCoord, mapSkillToSegment, unmapSkillFromSegment, addTempSegment, deleteTempSegment, commitTempSegments },
    before: { addSection, deleteSection, assignSectionSkill, setCurrentBar },
    metro: { setBpm, setMetroPlaying, setCurrentBeat },
    tuner: { setTunerActive, setTunerNote },
    grape: { toggleGrape, resetGrapes, adjustGrapeTotal },
    settings: { setGrapeBpmIncrement },
    xp: { logXp },
    ui: { toggleImmersion, setPracticeFullscreen },
  };
}

// ── 셀렉터 유틸 ───────────────────────────────────────────────────────────

/** 현재 마디 번호에 해당하는 Section을 반환한다. */
export function getSectionByBar(sections, barNumber) {
  if (!sections || barNumber == null) return null;
  return sections.find(s => barNumber >= s.range[0] && barNumber <= s.range[1]) ?? null;
}