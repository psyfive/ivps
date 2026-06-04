// src/hooks/usePracticeSession.js
import { useReducer, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  createCustomSkillId,
  customSkillRowToSkill,
  customSkillToLocalRow,
  customSkillToRow,
  getAllSkills,
  getSkillById,
  setRuntimeCustomSkills,
} from '../data/taxonomy';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// ── 초기 상태 ──────────────────────────────────────────────────────────────
export const INITIAL_STATE = {
  // ─ 네비게이션 ─
  screen: 'dashboard',        // 'dashboard' | 'library' | 'cockpit'
  phase: 'before',            // 'before' | 'during' | 'after'

  // ─ 스킬 ─
  activeSkillId: null,        // 현재 연습 중인 스킬 ID
  selectedSkillId: null,      // 모달 등에서 선택된 스킬 ID (미리보기)
  customSkills: [],
  customSkillStatus: 'idle',
  customSkillError: null,

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
  subdivision: 1,          // 1=Quarter, 2=Eighth, 3=Triplet, 4=Sixteenth
  ghostTrainBars: 8,       // Ghost Train — 구간 길이(마디)
  ghostTrainReadyBars: 1,  // Ghost Train — READY 길이(마디)

  // ─ 튜너 ─
  tunerActive: false,
  tunerNote: null,            // { name, cents, freq } | null

  // ─ 포도송이 체크 ─
  grapeTotal: 10,
  grapeFilled: 0,
  grapeBpmIncrement: 2,   // Rule of Three 달성 시 BPM 증가량

  // ─ XP (세션 결과) ─
  xpLog: [],                  // [{ skillId, result, xp, timestamp }]

  // ─ Quick Tray (Before Phase) ─
  quickTraySkills: [],        // string[] — 악보를 넘어 유지되는 빠른 매핑 스킬 ID 목록

  // ─ 시각적 구간 선택 모드 ─
  isSelectingSegment: false,  // 캔버스 드래그 구간 생성 모드
  selectedSegmentId: null,    // 선택된 구간 ID
  addingToSegmentId: null,    // 기존 구간에 박스 추가 중일 때 대상 구간 ID
  tempSegments: [],           // 미확정 구간 버퍼 [{id, coordinates, mappedSkills}]

  // ─ 필기 (Drawing) ─
  drawingMode: false,
  drawingTool: 'pen',         // 'pen' | 'downBow' | 'upBow' | 'eraser' | 'text'
  drawingColor: '#000000',
  drawingFontSize: 2,         // 1=Small(14px) / 2=Medium(22px) / 3=Large(32px)
  drawingBowingSize: 100,      // 60~180 (%) for downBow/upBow symbols

  // ─ UI ─
  practiceFullscreen: false, // During 진입 시 양 사이드 패널 접기
  duringChecklistMode: 'bubble', // 'bubble' | 'top'
  duringChecklistBubblePositions: {}, // { [segmentId]: { [pageIndex]: { x, y } } }

  // ─ 연습 종합 리뷰 (Last After Phase) ─
  reviewSegmentIndex: 0,   // LastAfterPhase 구간 내비게이터 인덱스

  // ─ 연습 세션 기록 ─
  practiceSessions: [],    // [{ id, scoreId, scoreName, skillIds, xpGained, durationMinutes, date }]

  // ─ 학습심리 기반 연습 흐름 ─
  practiceFlowMode: 'ordered', // 'ordered' | 'interleaved'
  interleaveHistory: [],       // segmentId[]
  reviewReminders: [],         // [{ id, scoreId, scoreName, segmentId, segmentIndex, skillIds, dueAt, intervalDays, status, isHard }]

  // ─ During Phase 진입 시각 (연습시간 계산용) ─
  duringStartTime: null,   // number | null (ms timestamp)

  // ─ 후원자 여부 (세션 기록 제한 해제) ─
  isPatron: false,         // true면 3개 상한 없음

  // ─ 활성 악기 ─
  activeInstrument: 'violin', // 현재는 'violin'만 활성

  // ─ 증상 필터 (라이브러리 증상 퀵 진입용) ─
  symptomFilter: null,         // { label, keywords } | null
};

// ── 액션 타입 ──────────────────────────────────────────────────────────────
export const ACTIONS = {
  // 네비게이션
  SET_SCREEN:        'SET_SCREEN',
  SET_PHASE:         'SET_PHASE',

  // 스킬
  SET_ACTIVE_SKILL:  'SET_ACTIVE_SKILL',
  SET_SELECTED_SKILL:'SET_SELECTED_SKILL',
  SET_CUSTOM_SKILLS: 'SET_CUSTOM_SKILLS',
  SET_CUSTOM_SKILL_STATUS: 'SET_CUSTOM_SKILL_STATUS',
  UPSERT_CUSTOM_SKILL: 'UPSERT_CUSTOM_SKILL',
  DELETE_CUSTOM_SKILL: 'DELETE_CUSTOM_SKILL',

  // 악보
  ADD_SCORE:         'ADD_SCORE',
  SET_ACTIVE_SCORE:  'SET_ACTIVE_SCORE',
  DELETE_SCORE:      'DELETE_SCORE',
  RENAME_SCORE:      'RENAME_SCORE',
  CHANGE_PAGE:       'CHANGE_PAGE',
  SET_PAGE:          'SET_PAGE',

  // 세션
  ADD_SESSION:       'ADD_SESSION',
  DELETE_SESSION:    'DELETE_SESSION',
  SELECT_SESSION:    'SELECT_SESSION',
  ASSIGN_SKILL:      'ASSIGN_SKILL',
  REMOVE_SKILL:      'REMOVE_SKILL',
  TOGGLE_CHECK:      'TOGGLE_CHECK',
  SET_PICKER_SESSION:'SET_PICKER_SESSION',

  // 메트로놈
  SET_BPM:               'SET_BPM',
  SET_BEATS_PER_BAR:     'SET_BEATS_PER_BAR',
  SET_METRO_PLAYING:     'SET_METRO_PLAYING',
  SET_CURRENT_BEAT:      'SET_CURRENT_BEAT',
  SET_SUBDIVISION:       'SET_SUBDIVISION',
  SET_GHOST_TRAIN_BARS:       'SET_GHOST_TRAIN_BARS',
  SET_GHOST_TRAIN_READY_BARS: 'SET_GHOST_TRAIN_READY_BARS',

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

  // Quick Tray
  ADD_QUICK_TRAY_SKILL:    'ADD_QUICK_TRAY_SKILL',
  REMOVE_QUICK_TRAY_SKILL: 'REMOVE_QUICK_TRAY_SKILL',
  TOGGLE_QUICK_TRAY_SKILL: 'TOGGLE_QUICK_TRAY_SKILL',

  // 시각적 구간 (Before Phase 드래그 매핑)
  TOGGLE_SEGMENT_CHECK:    'TOGGLE_SEGMENT_CHECK',
  TOGGLE_SEGMENT_MODE:     'TOGGLE_SEGMENT_MODE',
  START_ADD_TO_SEGMENT:    'START_ADD_TO_SEGMENT',
  SELECT_SEGMENT:          'SELECT_SEGMENT',
  DELETE_SEGMENT:          'DELETE_SEGMENT',
  DELETE_SEGMENT_COORD:    'DELETE_SEGMENT_COORD',
  UPDATE_SEGMENT_COORD:    'UPDATE_SEGMENT_COORD',
  SET_SEGMENT_META:        'SET_SEGMENT_META',
  MAP_SKILL_TO_SEGMENT:    'MAP_SKILL_TO_SEGMENT',
  UNMAP_SKILL_FROM_SEGMENT:'UNMAP_SKILL_FROM_SEGMENT',
  SET_SEGMENT_SYMPTOM_TAGS:'SET_SEGMENT_SYMPTOM_TAGS',
  // 임시 구간 버퍼 (드래그 완료 → 확정 전 대기)
  ADD_TEMP_SEGMENT:        'ADD_TEMP_SEGMENT',
  DELETE_TEMP_SEGMENT:     'DELETE_TEMP_SEGMENT',
  COMMIT_TEMP_SEGMENTS:    'COMMIT_TEMP_SEGMENTS',

  // Sections (Before Phase 마디 매핑)

  // 현재 마디 (During Phase)

  // 구간 난이도
  SET_SEGMENT_DIFFICULTY: 'SET_SEGMENT_DIFFICULTY',
  RECORD_SEGMENT_ATTEMPT: 'RECORD_SEGMENT_ATTEMPT',
  RESET_SEGMENT_PRACTICE_STATS: 'RESET_SEGMENT_PRACTICE_STATS',

  // 연습 흐름
  SET_PRACTICE_FLOW_MODE: 'SET_PRACTICE_FLOW_MODE',
  PICK_NEXT_SEGMENT:      'PICK_NEXT_SEGMENT',

  // 복습 알리미
  MARK_REVIEW_REMINDER_DONE: 'MARK_REVIEW_REMINDER_DONE',

  // 필기 (Drawing)
  ADD_STROKE:        'ADD_STROKE',
  UPDATE_STROKE:     'UPDATE_STROKE',
  REMOVE_STROKE:     'REMOVE_STROKE',
  UNDO_STROKE:       'UNDO_STROKE',
  CLEAR_DRAWINGS:    'CLEAR_DRAWINGS',
  SET_DRAWING_MODE:  'SET_DRAWING_MODE',
  SET_DRAWING_TOOL:  'SET_DRAWING_TOOL',
  SET_DRAWING_COLOR:     'SET_DRAWING_COLOR',
  SET_DRAWING_FONT_SIZE: 'SET_DRAWING_FONT_SIZE',
  SET_DRAWING_BOWING_SIZE: 'SET_DRAWING_BOWING_SIZE',

  // UI
  SET_PRACTICE_FULLSCREEN:'SET_PRACTICE_FULLSCREEN',
  SET_DURING_CHECKLIST_MODE: 'SET_DURING_CHECKLIST_MODE',
  SET_DURING_CHECKLIST_BUBBLE_POSITION: 'SET_DURING_CHECKLIST_BUBBLE_POSITION',
  RESET_DURING_CHECKLIST_BUBBLE_POSITION: 'RESET_DURING_CHECKLIST_BUBBLE_POSITION',

  // 연습 세션 기록
  RECORD_PRACTICE_SESSION: 'RECORD_PRACTICE_SESSION',

  // 연습 종합 리뷰 (Last After Phase)
  ENTER_LAST_AFTER:        'ENTER_LAST_AFTER',
  EXIT_LAST_AFTER:         'EXIT_LAST_AFTER',
  SET_REVIEW_SEGMENT_INDEX:'SET_REVIEW_SEGMENT_INDEX',

  // 후원자 설정

  // 악기 설정
  SET_INSTRUMENT:          'SET_INSTRUMENT',

  // 증상 필터
  SET_SYMPTOM_FILTER:      'SET_SYMPTOM_FILTER',

  // 클라우드 동기화
  MERGE_CLOUD_DATA:        'MERGE_CLOUD_DATA',
  UPDATE_SCORE_STORAGE:    'UPDATE_SCORE_STORAGE',
};

// ── 유틸 ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const REVIEW_INTERVAL_DAYS = [1, 3, 7];
const DAY_MS = 24 * 60 * 60 * 1000;
const QUICK_TRAY_STORAGE_KEY = 'ivps-quick-tray-skills';
const CUSTOM_SKILLS_STORAGE_KEY = 'ivps-custom-skills';
const APP_STATE_STORAGE_KEY = 'ivps-app-state-v1';
const MIN_BOWING_SIZE = 60;
const MAX_BOWING_SIZE = 180;

// ── Supabase 동기화 헬퍼 ──────────────────────────────────────────────────────

function scoreToDbRow(score, userId) {
  return {
    id: score.id,
    user_id: userId,
    name: score.name,
    uploaded_at: score.uploadedAt ?? null,
    page_count: score.pageData?.length ?? 1,
    segments: score.segments ?? [],
    drawings: score.drawings ?? [],
    page_storage_paths: score.storagePaths ?? [],
    updated_at: new Date().toISOString(),
  };
}

function dbRowToScore(row) {
  return {
    id: row.id,
    name: row.name,
    uploadedAt: row.uploaded_at,
    dataUrl: null,
    sessions: [],
    segments: (row.segments ?? []).map(seg => ({
      ...seg,
      skillMappings: seg.skillMappings ?? (seg.mappedSkills ?? []).map(id => ({ skillId: id, source: 'search', addedAt: 0 })),
    })),
    drawings: row.drawings ?? [],
    pageData: Array.from({ length: row.page_count ?? 1 }, () => ({ dataUrl: null, sessions: [] })),
    currentPageIndex: 0,
    quickTraySkills: [],
    storagePaths: row.page_storage_paths ?? [],
    _cloudOnly: true,
  };
}

function practiceSessionToDbRow(session, userId) {
  return {
    id: session.id,
    user_id: userId,
    score_id: session.scoreId ?? null,
    score_name: session.scoreName ?? null,
    skill_ids: session.skillIds ?? [],
    xp_gained: session.xpGained ?? 0,
    duration_minutes: session.durationMinutes ?? 0,
    has_quality_bonus: session.hasQualityBonus ?? false,
    session_date: session.date ?? null,
  };
}

function dbRowToPracticeSession(row) {
  return {
    id: row.id,
    scoreId: row.score_id,
    scoreName: row.score_name,
    skillIds: row.skill_ids ?? [],
    xpGained: row.xp_gained ?? 0,
    durationMinutes: row.duration_minutes ?? 0,
    hasQualityBonus: row.has_quality_bonus ?? false,
    date: row.session_date,
  };
}

// base64 dataUrl → Blob 변환
function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mime = (header.match(/:(.*?);/) ?? [])[1] ?? 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// 악보 페이지 이미지를 Supabase Storage에 업로드, storage paths 배열 반환
async function uploadScoreImages(scoreId, pageData, userId) {
  const paths = [];
  for (let i = 0; i < pageData.length; i++) {
    const { dataUrl } = pageData[i];
    if (!dataUrl || !supabase) { paths.push(null); continue; }
    try {
      const blob = dataUrlToBlob(dataUrl);
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const path = `${userId}/${scoreId}/page-${i}.${ext}`;
      const { error } = await supabase.storage
        .from('score-images')
        .upload(path, blob, { upsert: true, contentType: blob.type });
      paths.push(error ? null : path);
    } catch {
      paths.push(null);
    }
  }
  return paths;
}

// Storage paths → 서명된 URL 배열 생성 (1시간 유효)
async function createSignedUrlsForPaths(paths) {
  const EXPIRES_IN = 3600;
  return Promise.all(
    paths.map(async (path) => {
      if (!path || !supabase) return null;
      try {
        const { data, error } = await supabase.storage
          .from('score-images')
          .createSignedUrl(path, EXPIRES_IN);
        return error ? null : (data?.signedUrl ?? null);
      } catch {
        return null;
      }
    })
  );
}

// base64 dataUrl 여부 확인 (서명된 URL과 구분하기 위해 사용)
function isBase64DataUrl(str) {
  return typeof str === 'string' && str.startsWith('data:');
}

// 새로고침 후에도 복원할 상태 필드 목록
const PERSIST_KEYS = [
  'scores', 'activeScoreId',
  'practiceSessions', 'reviewReminders', 'xpLog',
  'bpm', 'beatsPerBar', 'subdivision', 'ghostTrainBars', 'ghostTrainReadyBars',
  'grapeTotal', 'grapeBpmIncrement',
  'practiceFlowMode',
  'activeInstrument',
  'duringChecklistMode', 'duringChecklistBubblePositions',
  'screen',
];

function loadPersistedAppState() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function savePersistedAppState(state) {
  if (typeof window === 'undefined') return;
  try {
    const partial = {};
    for (const key of PERSIST_KEYS) {
      partial[key] = state[key];
    }
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(partial));
  } catch {
    // QuotaExceededError: 악보 이미지가 너무 크면 저장 생략
  }
}

function normalizeSkillIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => typeof id === 'string' && getSkillById(id)))];
}

function loadPersistedQuickTraySkills() {
  if (typeof window === 'undefined') return [];
  try {
    return normalizeSkillIds(JSON.parse(window.localStorage.getItem(QUICK_TRAY_STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function savePersistedQuickTraySkills(skillIds) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUICK_TRAY_STORAGE_KEY, JSON.stringify(normalizeSkillIds(skillIds)));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function loadLocalCustomSkills() {
  if (typeof window === 'undefined') return [];
  try {
    const rows = JSON.parse(window.localStorage.getItem(CUSTOM_SKILLS_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(rows)) return [];
    return rows.map(row => customSkillRowToSkill({ ...row, storage: 'local', user_id: null })).filter(Boolean);
  } catch {
    return [];
  }
}

function saveLocalCustomSkills(skills) {
  if (typeof window === 'undefined') return { error: null };
  try {
    const rows = (skills ?? [])
      .filter(skill => skill?.storage === 'local')
      .map(skill => customSkillToLocalRow(skill));
    window.localStorage.setItem(CUSTOM_SKILLS_STORAGE_KEY, JSON.stringify(rows));
    return { error: null };
  } catch {
    return { error: 'Local browser storage is unavailable.' };
  }
}

function mergeCustomSkills(remoteSkills, localSkills) {
  const remoteIds = new Set((remoteSkills ?? []).map(skill => skill.id));
  return [
    ...(remoteSkills ?? []),
    ...(localSkills ?? []).filter(skill => !remoteIds.has(skill.id)),
  ];
}

function clampBowingSize(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.max(MIN_BOWING_SIZE, Math.min(MAX_BOWING_SIZE, numeric));
}

function initState(initialState) {
  const persisted = loadPersistedAppState();
  return {
    ...initialState,
    ...persisted,
    // 구형 저장 구간을 풍부한 매핑 모델로 lazy 백필 (하위 호환)
    scores: Array.isArray(persisted.scores)
      ? persisted.scores.map(migrateSegmentMappings)
      : initialState.scores,
    quickTraySkills: loadPersistedQuickTraySkills(),
    // 항상 초기화: 세션 간 유지하면 안 되는 일시적 상태
    phase: 'before',
    metroPlaying: false,
    currentBeat: -1,
    tunerActive: false,
    tunerNote: null,
    grapeFilled: 0,
    isSelectingSegment: false,
    selectedSegmentId: null,
    addingToSegmentId: null,
    tempSegments: [],
    drawingMode: false,
    practiceFullscreen: false,
    duringStartTime: null,
    pickerSessionId: null,
    activeSessionId: null,
    customSkillStatus: 'idle',
    customSkillError: null,
    customSkills: [],
    interleaveHistory: [],
    reviewSegmentIndex: 0,
    symptomFilter: null,
    selectedSkillId: null,
    activeSkillId: null,
  };
}

function emptyPracticeStats() {
  return {
    successStreak: 0,
    successTotal: 0,
    shakyTotal: 0,
    completedTodayAt: null,
  };
}

function normalizePracticeStats(stats) {
  return { ...emptyPracticeStats(), ...(stats ?? {}) };
}

function normalizeMeasureCount(value) {
  if (value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(1, Math.min(999, Math.round(numeric)));
}

// 구형 구간(mappedSkills만 있고 skillMappings 없음)을 풍부한 매핑 모델로 1회 백필.
// mappedSkills는 진실원본으로 유지하고, skillMappings를 'search' 출처로 파생한다.
export function migrateSegmentMappings(score) {
  if (!score || !Array.isArray(score.segments)) return score;
  let changed = false;
  const segments = score.segments.map(seg => {
    if (!seg || Array.isArray(seg.skillMappings)) return seg;
    changed = true;
    return {
      ...seg,
      skillMappings: (seg.mappedSkills ?? []).map(id => ({ skillId: id, source: 'search', addedAt: 0 })),
    };
  });
  return changed ? { ...score, segments } : score;
}

function getActiveScore(state) {
  return state.scores.find(s => s.id === state.activeScoreId) ?? null;
}

function updateActiveScore(scores, activeScoreId, updater) {
  return scores.map(s =>
    s.id === activeScoreId ? { ...s, ...updater(s) } : s
  );
}

function pickInterleavedSegment(segments, selectedSegmentId, randomValue = Math.random()) {
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];

  const candidates = segments.filter(seg => seg.id !== selectedSegmentId);
  const weighted = candidates.flatMap(seg => seg.difficulty === 'hard' ? [seg, seg] : [seg]);
  const index = Math.min(weighted.length - 1, Math.floor(randomValue * weighted.length));
  return weighted[index] ?? candidates[0] ?? null;
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
        practiceFullscreen: action.phase === 'during',
        // During 진입 시 시작 시각 기록 (연습시간 계산용)
        duringStartTime: action.phase === 'during' ? Date.now() : state.duringStartTime,
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

    case ACTIONS.SET_CUSTOM_SKILL_STATUS:
      return {
        ...state,
        customSkillStatus: action.status,
        customSkillError: action.error ?? null,
      };

    case ACTIONS.SET_CUSTOM_SKILLS:
      return {
        ...state,
        customSkills: action.skills ?? [],
        customSkillStatus: action.status ?? 'ready',
        customSkillError: action.error ?? null,
      };

    case ACTIONS.UPSERT_CUSTOM_SKILL: {
      const exists = state.customSkills.some(skill => skill.id === action.skill.id);
      return {
        ...state,
        customSkills: exists
          ? state.customSkills.map(skill => skill.id === action.skill.id ? action.skill : skill)
          : [action.skill, ...state.customSkills],
        customSkillStatus: 'ready',
        customSkillError: null,
      };
    }

    case ACTIONS.DELETE_CUSTOM_SKILL:
      return {
        ...state,
        customSkills: state.customSkills.filter(skill => skill.id !== action.skillId),
        selectedSkillId: state.selectedSkillId === action.skillId ? null : state.selectedSkillId,
        activeSkillId: state.activeSkillId === action.skillId ? null : state.activeSkillId,
        quickTraySkills: state.quickTraySkills.filter(id => id !== action.skillId),
        scores: state.scores.map(score => ({
          ...score,
          sessions: (score.sessions ?? []).map(session => ({
            ...session,
            skills: (session.skills ?? []).filter(id => id !== action.skillId),
          })),
          segments: (score.segments ?? []).map(segment => ({
            ...segment,
            mappedSkills: (segment.mappedSkills ?? []).filter(id => id !== action.skillId),
          })),
          quickTraySkills: (score.quickTraySkills ?? []).filter(id => id !== action.skillId),
        })),
        customSkillStatus: 'ready',
        customSkillError: null,
      };

    // ── 악보 ────────────────────────────────────────────────────────
    case ACTIONS.ADD_SCORE: {
      const { name, pageData, id: providedId } = action;
      // 각 페이지에 sessions 슬롯 보장 (segments는 score 레벨 — 페이지별 저장 불필요)
      const normalizedPageData = pageData.map(p => ({ sessions: [], ...p }));
      const score = {
        id: providedId ?? uid(),
        name,
        dataUrl: normalizedPageData[0].dataUrl,
        uploadedAt: Date.now(),
        sessions: [],
        segments: [],
        drawings: [],
        pageData: normalizedPageData,
        currentPageIndex: 0,
        quickTraySkills: [],
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

    case ACTIONS.SET_PAGE: {
      const score = getActiveScore(state);
      if (!score?.pageData) return state;
      const newIdx = action.pageIndex;
      if (newIdx < 0 || newIdx >= score.pageData.length || newIdx === score.currentPageIndex) return state;

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

    case ACTIONS.SET_SUBDIVISION:
      return { ...state, subdivision: Math.max(1, Math.min(4, action.subdivision)) };

    case ACTIONS.SET_GHOST_TRAIN_BARS:
      return { ...state, ghostTrainBars: Math.max(1, Math.min(32, action.bars)) };

    case ACTIONS.SET_GHOST_TRAIN_READY_BARS:
      return { ...state, ghostTrainReadyBars: Math.max(1, Math.min(8, action.bars)) };

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
          {
            skillId:   action.skillId,
            result:    action.result,
            xp:        earned,
            timestamp: Date.now(),
            scoreId:   action.scoreId   ?? null,
            segmentId: action.segmentId ?? null,
          },
          ...state.xpLog,
        ],
      };
    }

    // ── 시각적 구간 ───────────────────────────────────────────────────
    case ACTIONS.TOGGLE_SEGMENT_CHECK: {
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg => {
            if (seg.id !== action.segmentId) return seg;
            const checks = seg.checks ?? [];
            const idx = checks.indexOf(action.key);
            return {
              ...seg,
              checks: idx >= 0
                ? checks.filter(k => k !== action.key)
                : [...checks, action.key],
            };
          }),
        })),
      };
    }

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

    case ACTIONS.ADD_TEMP_SEGMENT: {
      const activeScoreForTemp = getActiveScore(state);
      const coordWithPage = {
        ...action.coordinates,
        pageIndex: activeScoreForTemp?.currentPageIndex ?? 0,
      };
      const tmp = {
        id: `tmp-${uid()}`,
        coordinates: coordWithPage,
        mappedSkills: [],
        measureCount: normalizeMeasureCount(action.measureCount),
        measureCountSource: action.measureCountSource ?? (action.measureCount ? 'auto' : null),
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
      const detectedCounts = state.tempSegments
        .map(t => normalizeMeasureCount(t.measureCount))
        .filter(count => count !== null);
      const combinedMeasureCount = detectedCounts.length === state.tempSegments.length
        ? detectedCounts.reduce((sum, count) => sum + count, 0)
        : null;
      const combinedMeasureSource = combinedMeasureCount ? 'auto' : null;

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
                ? {
                    ...seg,
                    coordinates: [...seg.coordinates, ...allCoords],
                    ...(seg.measureCountSource === 'manual' || !combinedMeasureCount
                      ? {}
                      : {
                          measureCount: normalizeMeasureCount((seg.measureCount ?? 0) + combinedMeasureCount),
                          measureCountSource: 'auto',
                        }),
                  }
                : seg
            ),
          })),
          selectedSegmentId: state.addingToSegmentId,
        };
      }

      // 신규 구간 생성 (기본 동작)
      const activeScoreForSeg = getActiveScore(state);
      const newSeg = {
        id: uid(),
        coordinates: allCoords,
        measures: { start: null, end: null },
        measureCount: combinedMeasureCount,
        measureCountSource: combinedMeasureSource,
        mappedSkills: [],
        checks: [],
        targetBpm: null,
        targetReps: null,
        practiceStats: emptyPracticeStats(),
        pageIndex: activeScoreForSeg?.currentPageIndex ?? 0,
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
      const nextMeasureCount = normalizeMeasureCount(action.measureCount);
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
                  ...(seg.measureCountSource === 'manual' || action.measureCount === undefined
                    ? {}
                    : {
                        measureCount: nextMeasureCount,
                        measureCountSource: nextMeasureCount ? 'auto' : null,
                      }),
                }
              : seg
          ),
        })),
      };
    }

    case ACTIONS.SET_SEGMENT_META: {
      const { segmentId, targetBpm, targetReps, measureCount, measureCountSource } = action;
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === segmentId
              ? {
                  ...seg,
                  ...(targetBpm  !== undefined ? { targetBpm  } : {}),
                  ...(targetReps !== undefined ? { targetReps } : {}),
                  ...(measureCount !== undefined ? { measureCount: normalizeMeasureCount(measureCount) } : {}),
                  ...(measureCountSource !== undefined ? { measureCountSource } : {}),
                }
              : seg
          ),
        })),
      };
    }

    case ACTIONS.MAP_SKILL_TO_SEGMENT:
      // mappedSkills(진실원본)에 ID를 더하고, 풍부한 메타는 skillMappings에 함께 기록.
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg => {
            if (seg.id !== action.segmentId || seg.mappedSkills.includes(action.skillId)) return seg;
            const mapping = {
              skillId: action.skillId,
              source: action.source ?? 'search',
              ...(action.symptomId ? { symptomId: action.symptomId } : {}),
              addedAt: Date.now(),
            };
            return {
              ...seg,
              mappedSkills: [...seg.mappedSkills, action.skillId],
              skillMappings: [...(seg.skillMappings ?? []), mapping],
            };
          }),
        })),
      };

    case ACTIONS.UNMAP_SKILL_FROM_SEGMENT:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === action.segmentId
              ? {
                  ...seg,
                  mappedSkills: seg.mappedSkills.filter(id => id !== action.skillId),
                  skillMappings: (seg.skillMappings ?? []).filter(m => m.skillId !== action.skillId),
                }
              : seg
          ),
        })),
      };

    case ACTIONS.SET_SEGMENT_SYMPTOM_TAGS: {
      const tags = Array.isArray(action.tagIds)
        ? [...new Set(action.tagIds.filter(t => typeof t === 'string'))]
        : [];
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === action.segmentId ? { ...seg, symptomTags: tags } : seg
          ),
        })),
      };
    }

    case ACTIONS.SET_SEGMENT_DIFFICULTY:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === action.segmentId
              ? { ...seg, difficulty: action.difficulty }
              : seg
          ),
        })),
      };

    case ACTIONS.RECORD_SEGMENT_ATTEMPT: {
      const { segmentId, result } = action;
      if (!segmentId || (result !== 'success' && result !== 'shaky')) return state;

      const scores = updateActiveScore(state.scores, state.activeScoreId, s => ({
        segments: (s.segments ?? []).map(seg => {
          if (seg.id !== segmentId) return seg;
          const stats = normalizePracticeStats(seg.practiceStats);
          if (result === 'shaky') {
            return {
              ...seg,
              practiceStats: {
                ...stats,
                successStreak: 0,
                shakyTotal: stats.shakyTotal + 1,
              },
            };
          }

          const nextStreak = stats.successStreak + 1;
          const crossedRuleOfThree = stats.successStreak < 3 && nextStreak === 3;
          const nextTargetBpm = crossedRuleOfThree && state.grapeBpmIncrement > 0
            ? Math.min(240, (seg.targetBpm ?? state.bpm) + state.grapeBpmIncrement)
            : seg.targetBpm;
          return {
            ...seg,
            targetBpm: nextTargetBpm,
            practiceStats: {
              ...stats,
              successStreak: nextStreak,
              successTotal: stats.successTotal + 1,
              completedTodayAt: crossedRuleOfThree ? Date.now() : stats.completedTodayAt,
            },
          };
        }),
      }));

      return {
        ...state,
        scores,
        grapeFilled: result === 'success' ? Math.min(state.grapeTotal, state.grapeFilled + 1) : state.grapeFilled,
      };
    }

    case ACTIONS.RESET_SEGMENT_PRACTICE_STATS:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          segments: (s.segments ?? []).map(seg =>
            seg.id === action.segmentId
              ? { ...seg, practiceStats: emptyPracticeStats() }
              : seg
          ),
        })),
      };

    case ACTIONS.SET_PRACTICE_FLOW_MODE:
      return {
        ...state,
        practiceFlowMode: action.mode === 'interleaved' ? 'interleaved' : 'ordered',
        interleaveHistory: [],
      };

    case ACTIONS.PICK_NEXT_SEGMENT: {
      const score = getActiveScore(state);
      const segments = score?.segments ?? [];
      if (segments.length === 0) return state;

      const target = state.practiceFlowMode === 'interleaved'
        ? pickInterleavedSegment(segments, state.selectedSegmentId, action.randomValue)
        : segments[Math.min(
            segments.length - 1,
            Math.max(0, segments.findIndex(seg => seg.id === state.selectedSegmentId) + 1),
          )];

      if (!target) return state;
      return {
        ...state,
        selectedSegmentId: target.id,
        interleaveHistory: [target.id, ...state.interleaveHistory].slice(0, 12),
      };
    }

    // ── Quick Tray ────────────────────────────────────────────────────
    case ACTIONS.ADD_QUICK_TRAY_SKILL:
      if (!getSkillById(action.skillId) || state.quickTraySkills.includes(action.skillId)) return state;
      return { ...state, quickTraySkills: [...state.quickTraySkills, action.skillId] };

    case ACTIONS.REMOVE_QUICK_TRAY_SKILL:
      return {
        ...state,
        quickTraySkills: state.quickTraySkills.filter(id => id !== action.skillId),
      };

    case ACTIONS.TOGGLE_QUICK_TRAY_SKILL: {
      if (!getSkillById(action.skillId)) return state;
      return {
        ...state,
        quickTraySkills: state.quickTraySkills.includes(action.skillId)
          ? state.quickTraySkills.filter(id => id !== action.skillId)
          : [...state.quickTraySkills, action.skillId],
      };
    }

    case ACTIONS.ADD_STROKE:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          drawings: [...(s.drawings ?? []), action.stroke],
        })),
      };

    case ACTIONS.UPDATE_STROKE:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          drawings: (s.drawings ?? []).map(d =>
            d.id === action.strokeId ? { ...d, ...action.patch } : d
          ),
        })),
      };

    case ACTIONS.REMOVE_STROKE:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          drawings: (s.drawings ?? []).filter(d => d.id !== action.strokeId),
        })),
      };

    case ACTIONS.UNDO_STROKE: {
      const scoreForUndo = getActiveScore(state);
      const pageIdxForUndo = scoreForUndo?.currentPageIndex ?? 0;
      const drawingsForUndo = scoreForUndo?.drawings ?? [];
      let lastStrokeId = null;
      for (let i = drawingsForUndo.length - 1; i >= 0; i--) {
        if (drawingsForUndo[i].pageIndex === pageIdxForUndo) {
          lastStrokeId = drawingsForUndo[i].id;
          break;
        }
      }
      if (!lastStrokeId) return state;
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          drawings: s.drawings.filter(d => d.id !== lastStrokeId),
        })),
      };
    }

    case ACTIONS.CLEAR_DRAWINGS:
      return {
        ...state,
        scores: updateActiveScore(state.scores, state.activeScoreId, s => ({
          drawings: (s.drawings ?? []).filter(d => d.pageIndex !== action.pageIndex),
        })),
      };

    case ACTIONS.SET_DRAWING_MODE:
      return { ...state, drawingMode: action.active };

    case ACTIONS.SET_DRAWING_TOOL:
      return { ...state, drawingTool: action.tool };

    case ACTIONS.SET_DRAWING_COLOR:
      return { ...state, drawingColor: action.color };

    case ACTIONS.SET_DRAWING_FONT_SIZE:
      return { ...state, drawingFontSize: action.size };

    case ACTIONS.SET_DRAWING_BOWING_SIZE:
      return { ...state, drawingBowingSize: clampBowingSize(action.size) };

    // ── UI ───────────────────────────────────────────────────────────

    case ACTIONS.SET_PRACTICE_FULLSCREEN:
      return { ...state, practiceFullscreen: action.value };

    case ACTIONS.SET_DURING_CHECKLIST_MODE:
      return {
        ...state,
        duringChecklistMode: action.mode === 'top' ? 'top' : 'bubble',
      };

    case ACTIONS.SET_DURING_CHECKLIST_BUBBLE_POSITION: {
      if (!action.segmentId || action.pageIndex == null || !action.position) return state;
      const pageKey = String(action.pageIndex);
      return {
        ...state,
        duringChecklistBubblePositions: {
          ...state.duringChecklistBubblePositions,
          [action.segmentId]: {
            ...(state.duringChecklistBubblePositions[action.segmentId] ?? {}),
            [pageKey]: action.position,
          },
        },
      };
    }

    case ACTIONS.RESET_DURING_CHECKLIST_BUBBLE_POSITION: {
      if (!action.segmentId) return state;
      const current = state.duringChecklistBubblePositions[action.segmentId];
      if (!current) return state;

      if (action.pageIndex == null) {
        const { [action.segmentId]: _removed, ...rest } = state.duringChecklistBubblePositions;
        return { ...state, duringChecklistBubblePositions: rest };
      }

      const pageKey = String(action.pageIndex);
      const { [pageKey]: _removedPage, ...remainingPages } = current;
      if (Object.keys(remainingPages).length === 0) {
        const { [action.segmentId]: _removedSegment, ...rest } = state.duringChecklistBubblePositions;
        return { ...state, duringChecklistBubblePositions: rest };
      }
      return {
        ...state,
        duringChecklistBubblePositions: {
          ...state.duringChecklistBubblePositions,
          [action.segmentId]: remainingPages,
        },
      };
    }

    // ── 연습 종합 리뷰 ────────────────────────────────────────────────
    case ACTIONS.ENTER_LAST_AFTER: {
      const score = getActiveScore(state);
      const now = Date.now();
      const skillIds = [...new Set(
        (score?.segments ?? []).flatMap(seg => seg.mappedSkills ?? []),
      )];
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const xpGained = state.xpLog
        .filter(e => e.scoreId === state.activeScoreId && e.timestamp >= todayStart.getTime())
        .reduce((sum, e) => sum + e.xp, 0);
      const durationMs = state.duringStartTime ? Date.now() - state.duringStartTime : 0;
      const durationMinutes = Math.round(durationMs / 60000);

      const duringStart = state.duringStartTime ?? 0;
      const sessionXpLog = state.xpLog.filter(e => e.timestamp >= duringStart);
      const hasGrapeStreak = state.grapeFilled >= 3;
      const hardSegIds = new Set((score?.segments ?? []).filter(s => s.difficulty === 'hard').map(s => s.id));
      const hasHardSegment = sessionXpLog.some(e => hardSegIds.has(e.segmentId));
      const hasSuccessStreak = sessionXpLog.filter(e => e.result === 'success').length >= 3;
      const hasQualityBonus = hasGrapeStreak || hasHardSegment || hasSuccessStreak;

      const sessionRecord = {
        id: uid(),
        scoreId: state.activeScoreId,
        scoreName: score?.name ?? '알 수 없음',
        skillIds,
        xpGained,
        durationMinutes,
        hasQualityBonus,
        date: now,
      };
      const newReminders = (score?.segments ?? []).flatMap((seg, index) => {
        const stats = normalizePracticeStats(seg.practiceStats);
        const isHard = seg.difficulty === 'hard';
        if (!stats.completedTodayAt && !isHard) return [];
        return REVIEW_INTERVAL_DAYS.map(days => ({
          id: uid(),
          scoreId: state.activeScoreId,
          scoreName: score?.name ?? '알 수 없음',
          segmentId: seg.id,
          segmentIndex: index,
          skillIds: seg.mappedSkills ?? [],
          dueAt: now + days * DAY_MS,
          intervalDays: days,
          status: 'pending',
          isHard,
        }));
      });
      return {
        ...state,
        phase: 'last-after',
        reviewSegmentIndex: 0,
        practiceFullscreen: false,
        selectedSegmentId: null,
        isSelectingSegment: false,
        tempSegments: [],
        pickerSessionId: null,
        duringStartTime: null,
        practiceSessions: (() => {
          const all = [sessionRecord, ...state.practiceSessions];
          return state.isPatron ? all : all.slice(0, 3);
        })(),
        reviewReminders: [...newReminders, ...state.reviewReminders],
      };
    }

    case ACTIONS.EXIT_LAST_AFTER:
      return {
        ...state,
        phase: 'before',
        screen: 'dashboard',
        reviewSegmentIndex: 0,
      };

    case ACTIONS.SET_REVIEW_SEGMENT_INDEX:
      return { ...state, reviewSegmentIndex: action.index };

    case ACTIONS.MARK_REVIEW_REMINDER_DONE:
      return {
        ...state,
        reviewReminders: state.reviewReminders.map(reminder =>
          reminder.id === action.reminderId
            ? { ...reminder, status: 'done', completedAt: Date.now() }
            : reminder
        ),
      };

    case ACTIONS.SET_INSTRUMENT:
      return { ...state, activeInstrument: action.value };

    case ACTIONS.SET_SYMPTOM_FILTER:
      return { ...state, symptomFilter: action.value };

    case ACTIONS.MERGE_CLOUD_DATA: {
      const { remoteScores, remoteSessions } = action;
      const localScoreIds = new Set(state.scores.map(s => s.id));

      // 로컬에 있는 악보: 이미지(dataUrl) 유지, 구간/필기는 원격이 더 많으면 원격 우선
      const mergedLocalScores = state.scores.map(local => {
        const remote = remoteScores.find(r => r.id === local.id);
        if (!remote) return local;
        const useRemoteSegments = (remote.segments?.length ?? 0) > (local.segments?.length ?? 0);
        const useRemoteDrawings = (remote.drawings?.length ?? 0) > (local.drawings?.length ?? 0);
        return {
          ...local,
          segments: useRemoteSegments ? remote.segments : local.segments,
          drawings: useRemoteDrawings ? remote.drawings : local.drawings,
        };
      });

      // 원격에만 있는 악보 (다른 기기에서 생성됨, 이미지 없음)
      const cloudOnlyScores = remoteScores.filter(r => !localScoreIds.has(r.id));

      // 세션: 원격 우선, 로컬에만 있는 것 보완
      const remoteSessionIds = new Set(remoteSessions.map(s => s.id));
      const localOnlySessions = state.practiceSessions.filter(s => !remoteSessionIds.has(s.id));
      const mergedSessions = [...remoteSessions, ...localOnlySessions];

      return {
        ...state,
        scores: [...mergedLocalScores, ...cloudOnlyScores],
        practiceSessions: state.isPatron ? mergedSessions : mergedSessions.slice(0, 50),
      };
    }

    case ACTIONS.UPDATE_SCORE_STORAGE: {
      // action.storagePaths  : Storage에 업로드된 경로 배열 (업로드 완료 후)
      // action.signedUrls    : Storage에서 가져온 서명된 URL 배열 (로그인 시 이미지 복원)
      // 규칙: base64 dataUrl은 절대 덮어쓰지 않음 → 로컬 이미지 보존
      return {
        ...state,
        scores: state.scores.map(s => {
          if (s.id !== action.scoreId) return s;

          let pageData = s.pageData;
          if (action.signedUrls) {
            pageData = s.pageData.map((p, i) => ({
              ...p,
              dataUrl: isBase64DataUrl(p.dataUrl)
                ? p.dataUrl                                    // 로컬 base64 유지
                : (action.signedUrls[i] ?? p.dataUrl),        // 클라우드 전용: 서명 URL 적용
            }));
          }

          return {
            ...s,
            dataUrl: isBase64DataUrl(s.dataUrl)
              ? s.dataUrl
              : (action.signedUrls?.[0] ?? s.dataUrl),
            pageData,
            storagePaths: action.storagePaths ?? s.storagePaths,
            _cloudOnly: action.signedUrls ? false : s._cloudOnly,
          };
        }),
      };
    }

    default:
      return state;
  }
}

// ── 메인 훅 ───────────────────────────────────────────────────────────────
export function usePracticeSession() {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, initState);
  const allSkills = useMemo(() => getAllSkills(state.customSkills), [state.customSkills]);

  setRuntimeCustomSkills(state.customSkills);

  useEffect(() => {
    savePersistedQuickTraySkills(state.quickTraySkills);
  }, [state.quickTraySkills]);

  // 앱 상태 지속성 — 새로고침 후에도 악보·구간·기록이 유지되도록 500ms 디바운스 저장
  useEffect(() => {
    const id = setTimeout(() => savePersistedAppState(state), 500);
    return () => clearTimeout(id);
  }, [
    state.scores,
    state.activeScoreId,
    state.practiceSessions,
    state.reviewReminders,
    state.xpLog,
    state.bpm,
    state.beatsPerBar,
    state.subdivision,
    state.ghostTrainBars,
    state.ghostTrainReadyBars,
    state.grapeTotal,
    state.grapeBpmIncrement,
    state.practiceFlowMode,
    state.activeInstrument,
    state.duringChecklistMode,
    state.duringChecklistBubblePositions,
    state.screen,
  ]);

  // 로그인 시 Supabase에서 scores / practice_sessions 로드 후 로컬과 병합
  useEffect(() => {
    let cancelled = false;

    async function syncFromCloud() {
      if (!supabase || !user?.id) return;

      const [{ data: scoreRows, error: scoreErr }, { data: sessionRows, error: sessionErr }] =
        await Promise.all([
          supabase.from('scores').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
          supabase.from('practice_sessions').select('*').eq('user_id', user.id).order('session_date', { ascending: false }),
        ]);

      if (cancelled || scoreErr || sessionErr) return;

      const remoteScores = (scoreRows ?? []).map(dbRowToScore);

      dispatch({
        type: ACTIONS.MERGE_CLOUD_DATA,
        remoteScores,
        remoteSessions: (sessionRows ?? []).map(dbRowToPracticeSession),
      });

      // Storage에 이미지가 있는 악보의 서명된 URL 생성 (만료 1시간)
      // base64 dataUrl이 있는 로컬 악보는 건너뜀 (isBase64DataUrl 체크는 reducer에서 처리)
      for (const remoteScore of remoteScores) {
        if (cancelled) break;
        const paths = remoteScore.storagePaths ?? [];
        if (!paths.some(p => p)) continue;

        const signedUrls = await createSignedUrlsForPaths(paths);
        if (cancelled) break;
        if (signedUrls.some(u => u)) {
          dispatch({
            type: ACTIONS.UPDATE_SCORE_STORAGE,
            scoreId: remoteScore.id,
            signedUrls,
          });
        }
      }
    }

    syncFromCloud();
    return () => { cancelled = true; };
  }, [user?.id]);

  // scores / practice_sessions 변경 시 Supabase에 2초 디바운스 저장
  const cloudSyncTimerRef = useRef(null);
  useEffect(() => {
    if (!supabase || !user?.id) return;

    clearTimeout(cloudSyncTimerRef.current);
    cloudSyncTimerRef.current = setTimeout(async () => {
      const scoreRows = state.scores.map(s => scoreToDbRow(s, user.id));
      const sessionRows = state.practiceSessions.map(s => practiceSessionToDbRow(s, user.id));

      const ops = [];
      if (scoreRows.length > 0) {
        ops.push(supabase.from('scores').upsert(scoreRows, { onConflict: 'id' }));
      }
      if (sessionRows.length > 0) {
        ops.push(supabase.from('practice_sessions').upsert(sessionRows, { onConflict: 'id' }));
      }
      await Promise.all(ops);
    }, 2000);

    return () => clearTimeout(cloudSyncTimerRef.current);
  }, [state.scores, state.practiceSessions, user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomSkills() {
      const localSkills = loadLocalCustomSkills();

      if (!supabase || !user?.id) {
        dispatch({
          type: ACTIONS.SET_CUSTOM_SKILLS,
          skills: localSkills,
          status: 'ready',
        });
        return;
      }

      dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'loading' });
      const { data, error } = await supabase
        .from('custom_skills')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        dispatch({
          type: ACTIONS.SET_CUSTOM_SKILL_STATUS,
          status: 'error',
          error: error.message,
        });
        return;
      }

      dispatch({
        type: ACTIONS.SET_CUSTOM_SKILLS,
        skills: mergeCustomSkills(
          (data ?? [])
            .map(row => customSkillRowToSkill({ ...row, storage: 'remote' }))
            .filter(Boolean),
          localSkills,
        ),
        status: 'ready',
      });
    }

    loadCustomSkills();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // 편의 셀렉터
  const activeScore = state.scores.find(s => s.id === state.activeScoreId) ?? null;
  const resolveSkillById = useCallback(
    skillId => allSkills.find(skill => skill.id === skillId) ?? null,
    [allSkills],
  );
  const activeSkill = resolveSkillById(state.activeSkillId);
  const selectedSkill = resolveSkillById(state.selectedSkillId);
  const activeSession = activeScore?.sessions.find(s => s.id === state.activeSessionId) ?? null;
  const selectedSegment = activeScore?.segments?.find(s => s.id === state.selectedSegmentId) ?? null;

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
  // ── 악보 액션 ─────────────────────────────────────────────────────
  const addScore = useCallback(async (name, pageData) => {
    const scoreId = uid();
    dispatch({ type: ACTIONS.ADD_SCORE, name, pageData, id: scoreId });

    if (!supabase || !user?.id) return;

    // 페이지 이미지를 Storage에 업로드 (백그라운드, 낙관적 업데이트 후)
    const storagePaths = await uploadScoreImages(scoreId, pageData, user.id);
    if (storagePaths.some(p => p)) {
      dispatch({ type: ACTIONS.UPDATE_SCORE_STORAGE, scoreId, storagePaths });
      // DB에 storagePaths 즉시 반영 (디바운스 사이클 기다리지 않음)
      await supabase.from('scores')
        .update({ page_storage_paths: storagePaths, updated_at: new Date().toISOString() })
        .eq('id', scoreId).eq('user_id', user.id);
    }
  }, [user?.id]);

  const setActiveScore = useCallback((scoreId) =>
    dispatch({ type: ACTIONS.SET_ACTIVE_SCORE, scoreId }), []);

  const deleteScore = useCallback(async (scoreId) => {
    dispatch({ type: ACTIONS.DELETE_SCORE, scoreId });
    if (supabase && user?.id) {
      await supabase.from('scores').delete().eq('id', scoreId).eq('user_id', user.id);
    }
  }, [user?.id]);

  const renameScore = useCallback(async (scoreId, name) => {
    dispatch({ type: ACTIONS.RENAME_SCORE, scoreId, name });
    if (supabase && user?.id) {
      await supabase.from('scores').update({ name, updated_at: new Date().toISOString() })
        .eq('id', scoreId).eq('user_id', user.id);
    }
  }, [user?.id]);

  const changePage = useCallback((direction) =>
    dispatch({ type: ACTIONS.CHANGE_PAGE, direction }), []);

  const setPage = useCallback((pageIndex) =>
    dispatch({ type: ACTIONS.SET_PAGE, pageIndex }), []);

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

  const setBeatsPerBar = useCallback((beats) =>
    dispatch({ type: ACTIONS.SET_BEATS_PER_BAR, beats: Math.max(1, Math.min(16, Number(beats))) }), []);

  const setMetroPlaying = useCallback((playing) =>
    dispatch({ type: ACTIONS.SET_METRO_PLAYING, playing }), []);

  const setCurrentBeat = useCallback((beat) =>
    dispatch({ type: ACTIONS.SET_CURRENT_BEAT, beat }), []);

  const setSubdivision = useCallback((subdivision) =>
    dispatch({ type: ACTIONS.SET_SUBDIVISION, subdivision }), []);

  const setGhostTrainBars = useCallback((bars) =>
    dispatch({ type: ACTIONS.SET_GHOST_TRAIN_BARS, bars: Number(bars) }), []);

  const setGhostTrainReadyBars = useCallback((bars) =>
    dispatch({ type: ACTIONS.SET_GHOST_TRAIN_READY_BARS, bars: Number(bars) }), []);

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

  const setInstrument = useCallback((value) =>
    dispatch({ type: ACTIONS.SET_INSTRUMENT, value }), []);

  const setSymptomFilter = useCallback((value) =>
    dispatch({ type: ACTIONS.SET_SYMPTOM_FILTER, value }), []);

  // ── XP 액션 ──────────────────────────────────────────────────────
  const logXp = useCallback((skillId, result, scoreId = null, segmentId = null) =>
    dispatch({ type: ACTIONS.LOG_XP, skillId, result, scoreId, segmentId }), []);

  // ── 시각적 구간 액션 ─────────────────────────────────────────────
  const toggleSegmentCheck = useCallback((segmentId, key) =>
    dispatch({ type: ACTIONS.TOGGLE_SEGMENT_CHECK, segmentId, key }), []);

  const toggleSegmentMode = useCallback(() =>
    dispatch({ type: ACTIONS.TOGGLE_SEGMENT_MODE }), []);

  const selectSegment = useCallback((segmentId) =>
    dispatch({ type: ACTIONS.SELECT_SEGMENT, segmentId }), []);
  const deleteSegment = useCallback((segmentId) =>
    dispatch({ type: ACTIONS.DELETE_SEGMENT, segmentId }), []);

  const deleteSegmentCoord = useCallback((segmentId, coordIndex) =>
    dispatch({ type: ACTIONS.DELETE_SEGMENT_COORD, segmentId, coordIndex }), []);

  const setSegmentMeta = useCallback((segmentId, meta) =>
    dispatch({ type: ACTIONS.SET_SEGMENT_META, segmentId, ...meta }), []);

  const startAddToSegment = useCallback((segmentId) =>
    dispatch({ type: ACTIONS.START_ADD_TO_SEGMENT, segmentId }), []);

  const updateSegmentCoord = useCallback((segmentId, coordIndex, coord, meta = {}) =>
    dispatch({ type: ACTIONS.UPDATE_SEGMENT_COORD, segmentId, coordIndex, coord, ...meta }), []);

  const mapSkillToSegment = useCallback((segmentId, skillId, meta = {}) =>
    dispatch({
      type: ACTIONS.MAP_SKILL_TO_SEGMENT,
      segmentId,
      skillId,
      source: meta.source,
      symptomId: meta.symptomId,
    }), []);

  const unmapSkillFromSegment = useCallback((segmentId, skillId) =>
    dispatch({ type: ACTIONS.UNMAP_SKILL_FROM_SEGMENT, segmentId, skillId }), []);

  const setSegmentSymptomTags = useCallback((segmentId, tagIds) =>
    dispatch({ type: ACTIONS.SET_SEGMENT_SYMPTOM_TAGS, segmentId, tagIds }), []);

  const addTempSegment = useCallback((coordinates, meta = {}) =>
    dispatch({ type: ACTIONS.ADD_TEMP_SEGMENT, coordinates, ...meta }), []);

  const deleteTempSegment = useCallback((id) =>
    dispatch({ type: ACTIONS.DELETE_TEMP_SEGMENT, id }), []);

  const commitTempSegments = useCallback(() =>
    dispatch({ type: ACTIONS.COMMIT_TEMP_SEGMENTS }), []);

  const setSegmentDifficulty = useCallback((segmentId, difficulty) =>
    dispatch({ type: ACTIONS.SET_SEGMENT_DIFFICULTY, segmentId, difficulty }), []);

  const recordAttempt = useCallback((segmentId, result) =>
    dispatch({ type: ACTIONS.RECORD_SEGMENT_ATTEMPT, segmentId, result }), []);

  const resetPracticeStats = useCallback((segmentId) =>
    dispatch({ type: ACTIONS.RESET_SEGMENT_PRACTICE_STATS, segmentId }), []);

  const setPracticeFlowMode = useCallback((mode) =>
    dispatch({ type: ACTIONS.SET_PRACTICE_FLOW_MODE, mode }), []);

  const pickNextSegment = useCallback(() =>
    dispatch({ type: ACTIONS.PICK_NEXT_SEGMENT }), []);

  const markReminderDone = useCallback((reminderId) =>
    dispatch({ type: ACTIONS.MARK_REVIEW_REMINDER_DONE, reminderId }), []);

  // ── Quick Tray 액션 ──────────────────────────────────────────────
  const addQuickTraySkill = useCallback((skillId) =>
    dispatch({ type: ACTIONS.ADD_QUICK_TRAY_SKILL, skillId }), []);

  const removeQuickTraySkill = useCallback((skillId) =>
    dispatch({ type: ACTIONS.REMOVE_QUICK_TRAY_SKILL, skillId }), []);

  const toggleQuickTraySkill = useCallback((skillId) =>
    dispatch({ type: ACTIONS.TOGGLE_QUICK_TRAY_SKILL, skillId }), []);

  // ── 필기 액션 ────────────────────────────────────────────────────
  const addStroke = useCallback((stroke) =>
    dispatch({ type: ACTIONS.ADD_STROKE, stroke }), []);

  const updateStroke = useCallback((strokeId, patch) =>
    dispatch({ type: ACTIONS.UPDATE_STROKE, strokeId, patch }), []);

  const removeStroke = useCallback((strokeId) =>
    dispatch({ type: ACTIONS.REMOVE_STROKE, strokeId }), []);

  const undoStroke = useCallback(() =>
    dispatch({ type: ACTIONS.UNDO_STROKE }), []);

  const clearDrawings = useCallback((pageIndex) =>
    dispatch({ type: ACTIONS.CLEAR_DRAWINGS, pageIndex }), []);

  const setDrawingMode = useCallback((active) =>
    dispatch({ type: ACTIONS.SET_DRAWING_MODE, active }), []);

  const setDrawingTool = useCallback((tool) =>
    dispatch({ type: ACTIONS.SET_DRAWING_TOOL, tool }), []);

  const setDrawingColor = useCallback((color) =>
    dispatch({ type: ACTIONS.SET_DRAWING_COLOR, color }), []);

  const setDrawingFontSize = useCallback((size) =>
    dispatch({ type: ACTIONS.SET_DRAWING_FONT_SIZE, size }), []);

  const setDrawingBowingSize = useCallback((size) =>
    dispatch({ type: ACTIONS.SET_DRAWING_BOWING_SIZE, size }), []);

  // ── UI 액션 ──────────────────────────────────────────────────────
  const setPracticeFullscreen = useCallback((value) =>
    dispatch({ type: ACTIONS.SET_PRACTICE_FULLSCREEN, value }), []);

  const setDuringChecklistMode = useCallback((mode) =>
    dispatch({ type: ACTIONS.SET_DURING_CHECKLIST_MODE, mode }), []);

  const setDuringChecklistBubblePosition = useCallback((segmentId, pageIndex, position) =>
    dispatch({
      type: ACTIONS.SET_DURING_CHECKLIST_BUBBLE_POSITION,
      segmentId,
      pageIndex,
      position,
    }), []);

  const resetDuringChecklistBubblePosition = useCallback((segmentId, pageIndex = null) =>
    dispatch({
      type: ACTIONS.RESET_DURING_CHECKLIST_BUBBLE_POSITION,
      segmentId,
      pageIndex,
    }), []);

  // ── Last After Phase 액션 ─────────────────────────────────────────
  const enterLastAfter = useCallback(() =>
    dispatch({ type: ACTIONS.ENTER_LAST_AFTER }), []);

  const exitLastAfter = useCallback(() =>
    dispatch({ type: ACTIONS.EXIT_LAST_AFTER }), []);

  const setReviewIndex = useCallback((index) =>
    dispatch({ type: ACTIONS.SET_REVIEW_SEGMENT_INDEX, index }), []);

  const createCustomSkill = useCallback(async (payload) => {
    if (!supabase || !user?.id) {
      const skill = customSkillRowToSkill(customSkillToLocalRow({
        ...payload,
        id: createCustomSkillId(payload?.category),
      }));
      const localSkills = [skill, ...state.customSkills.filter(item => item.storage === 'local')];
      const { error } = saveLocalCustomSkills(localSkills);
      if (error) {
        dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'error', error });
        return { data: null, error };
      }
      dispatch({ type: ACTIONS.UPSERT_CUSTOM_SKILL, skill });
      return { data: skill, error: null };
    }

    const id = createCustomSkillId(payload?.category);
    const row = customSkillToRow({ ...payload, id }, user.id);
    dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'saving' });

    const { data, error } = await supabase
      .from('custom_skills')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'error', error: error.message });
      return { data: null, error: error.message };
    }

    const skill = customSkillRowToSkill({ ...data, storage: 'remote' });
    dispatch({ type: ACTIONS.UPSERT_CUSTOM_SKILL, skill });
    return { data: skill, error: null };
  }, [state.customSkills, user?.id]);

  const updateCustomSkill = useCallback(async (skillId, payload) => {
    const existing = state.customSkills.find(skill => skill.id === skillId);
    if (!existing || existing.storage === 'local' || !supabase || !user?.id) {
      const skill = customSkillRowToSkill(customSkillToLocalRow({
        ...existing,
        ...payload,
        id: skillId,
        storage: 'local',
      }));
      const localSkills = state.customSkills
        .filter(item => item.storage === 'local' && item.id !== skillId);
      const { error } = saveLocalCustomSkills([skill, ...localSkills]);
      if (error) {
        dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'error', error });
        return { data: null, error };
      }
      dispatch({ type: ACTIONS.UPSERT_CUSTOM_SKILL, skill });
      return { data: skill, error: null };
    }

    const row = customSkillToRow({ ...existing, ...payload, id: skillId }, user.id);
    dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'saving' });

    const { data, error } = await supabase
      .from('custom_skills')
      .update(row)
      .eq('id', skillId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'error', error: error.message });
      return { data: null, error: error.message };
    }

    const skill = customSkillRowToSkill({ ...data, storage: 'remote' });
    dispatch({ type: ACTIONS.UPSERT_CUSTOM_SKILL, skill });
    return { data: skill, error: null };
  }, [state.customSkills, user?.id]);

  const deleteCustomSkill = useCallback(async (skillId) => {
    const existing = state.customSkills.find(skill => skill.id === skillId);
    if (!existing || existing.storage === 'local' || !supabase || !user?.id) {
      const localSkills = state.customSkills
        .filter(skill => skill.storage === 'local' && skill.id !== skillId);
      const { error } = saveLocalCustomSkills(localSkills);
      if (error) {
        dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'error', error });
        return { error };
      }
      dispatch({ type: ACTIONS.DELETE_CUSTOM_SKILL, skillId });
      return { error: null };
    }

    dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'saving' });
    const { error } = await supabase
      .from('custom_skills')
      .delete()
      .eq('id', skillId)
      .eq('user_id', user.id);

    if (error) {
      dispatch({ type: ACTIONS.SET_CUSTOM_SKILL_STATUS, status: 'error', error: error.message });
      return { error: error.message };
    }

    dispatch({ type: ACTIONS.DELETE_CUSTOM_SKILL, skillId });
    return { error: null };
  }, [state.customSkills, user?.id]);

  // ── 컨텍스트 최적화: 액션 네임스페이스 메모이제이션 ───────────────────────
  // 각 네임스페이스 객체를 useMemo로 안정화해서 PracticeContext의 슬라이스 메모가
  // currentBeat/tunerNote 변화에 반응하지 않도록 한다.
  const navNs = useMemo(() => ({
    navigate, setPhase, goSkillPractice, enterLastAfter, exitLastAfter, setReviewIndex,
  }), [navigate, setPhase, goSkillPractice, enterLastAfter, exitLastAfter, setReviewIndex]);

  const skillNs = useMemo(() => ({
    openSkillModal, closeSkillModal, setSymptomFilter,
  }), [openSkillModal, closeSkillModal, setSymptomFilter]);

  const customSkillNs = useMemo(() => ({
    create: createCustomSkill, update: updateCustomSkill, remove: deleteCustomSkill,
  }), [createCustomSkill, updateCustomSkill, deleteCustomSkill]);

  const taxonomyNs = useMemo(() => ({
    allSkills, customSkills: state.customSkills, getSkillById: resolveSkillById,
  }), [allSkills, state.customSkills, resolveSkillById]);

  const scoreNs = useMemo(() => ({
    addScore, setActiveScore, deleteScore, renameScore, changePage, setPage,
  }), [addScore, setActiveScore, deleteScore, renameScore, changePage, setPage]);

  const sessionNs = useMemo(() => ({
    addSession, deleteSession, selectSession, assignSkill, removeSkill,
    toggleCheck, openPicker, closePicker,
  }), [addSession, deleteSession, selectSession, assignSkill, removeSkill,
      toggleCheck, openPicker, closePicker]);

  const cartNs = useMemo(() => ({
    addQuickTraySkill, removeQuickTraySkill, toggleQuickTraySkill,
  }), [addQuickTraySkill, removeQuickTraySkill, toggleQuickTraySkill]);

  const segmentNs = useMemo(() => ({
    toggleSegmentCheck, toggleSegmentMode, startAddToSegment, selectSegment,
    deleteSegment, deleteSegmentCoord, setSegmentMeta, updateSegmentCoord,
    mapSkillToSegment, unmapSkillFromSegment, setSegmentSymptomTags,
    addTempSegment, deleteTempSegment,
    commitTempSegments, setSegmentDifficulty, recordAttempt, resetPracticeStats,
  }), [
    toggleSegmentCheck, toggleSegmentMode, startAddToSegment, selectSegment,
    deleteSegment, deleteSegmentCoord, setSegmentMeta, updateSegmentCoord,
    mapSkillToSegment, unmapSkillFromSegment, setSegmentSymptomTags,
    addTempSegment, deleteTempSegment,
    commitTempSegments, setSegmentDifficulty, recordAttempt, resetPracticeStats,
  ]);

  const practiceFlowNs = useMemo(() => ({
    setMode: setPracticeFlowMode, pickNextSegment,
  }), [setPracticeFlowMode, pickNextSegment]);

  const reviewNs = useMemo(() => ({ markReminderDone }), [markReminderDone]);

  const drawingNs = useMemo(() => ({
    addStroke, updateStroke, removeStroke, undoStroke, clearDrawings,
    setDrawingMode, setDrawingTool, setDrawingColor, setDrawingFontSize, setDrawingBowingSize,
  }), [
    addStroke, updateStroke, removeStroke, undoStroke, clearDrawings,
    setDrawingMode, setDrawingTool, setDrawingColor, setDrawingFontSize, setDrawingBowingSize,
  ]);

  const metroNs = useMemo(() => ({
    setBpm, setBeatsPerBar, setMetroPlaying, setCurrentBeat,
    setSubdivision, setGhostTrainBars, setGhostTrainReadyBars,
  }), [setBpm, setBeatsPerBar, setMetroPlaying, setCurrentBeat,
      setSubdivision, setGhostTrainBars, setGhostTrainReadyBars]);

  const tunerNs = useMemo(() => ({
    setTunerActive, setTunerNote,
  }), [setTunerActive, setTunerNote]);

  const grapeNs = useMemo(() => ({
    toggleGrape, resetGrapes, adjustGrapeTotal,
  }), [toggleGrape, resetGrapes, adjustGrapeTotal]);

  const settingsNs = useMemo(() => ({
    setGrapeBpmIncrement, setInstrument, setDuringChecklistMode,
    setDuringChecklistBubblePosition, resetDuringChecklistBubblePosition,
  }), [
    setGrapeBpmIncrement, setInstrument, setDuringChecklistMode,
    setDuringChecklistBubblePosition, resetDuringChecklistBubblePosition,
  ]);

  const xpNs = useMemo(() => ({ logXp }), [logXp]);

  const uiNs = useMemo(() => ({ setPracticeFullscreen }), [setPracticeFullscreen]);

  return {
    // 상태
    ...state,
    activeScore,
    activeSkill,
    selectedSkill,
    activeSession,
    selectedSegment,
    allSkills,
    resolveSkillById,

    // 액션 (그룹화) — 메모이제이션된 네임스페이스 객체 사용
    nav: navNs,
    skill: skillNs,
    customSkill: customSkillNs,
    taxonomy: taxonomyNs,
    score: scoreNs,
    session: sessionNs,
    cart: cartNs,
    segment: segmentNs,
    practiceFlow: practiceFlowNs,
    review: reviewNs,
    drawing: drawingNs,
    metro: metroNs,
    tuner: tunerNs,
    grape: grapeNs,
    settings: settingsNs,
    xp: xpNs,
    ui: uiNs,
  };
}

