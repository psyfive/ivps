// src/test/reducer.test.js
// usePracticeSession reducer 단위 테스트
// reducer는 순수함수(state, action) => newState 이므로 React 환경 없이 테스트 가능.

import { describe, it, expect, beforeEach } from 'vitest';
import { reducer, INITIAL_STATE, ACTIONS } from '../hooks/usePracticeSession';

// ── 테스트 유틸 ────────────────────────────────────────────────────────────
function makeScore(overrides = {}) {
  return {
    id: 'score-1',
    name: '테스트 악보',
    dataUrl: 'data:image/png;base64,abc',
    uploadedAt: 1000,
    sessions: [],
    pageData: [{ dataUrl: 'data:image/png;base64,abc', sessions: [] }],
    currentPageIndex: 0,
    ...overrides,
  };
}

function makeSession(overrides = {}) {
  return {
    id: 'sess-1',
    rect: { x: 10, y: 10, w: 30, h: 20 },
    skills: [],
    checks: [],
    ...overrides,
  };
}

// ── 네비게이션 ─────────────────────────────────────────────────────────────
describe('네비게이션', () => {
  it('SET_SCREEN: screen을 변경하고 selectedSkillId를 초기화한다', () => {
    const state = { ...INITIAL_STATE, selectedSkillId: 'A-1-1' };
    const next = reducer(state, { type: ACTIONS.SET_SCREEN, screen: 'library' });
    expect(next.screen).toBe('library');
    expect(next.selectedSkillId).toBeNull();
  });

  it('SET_PHASE: phase를 변경하고 activeSessionId를 초기화한다', () => {
    const state = { ...INITIAL_STATE, activeSessionId: 'sess-1' };
    const next = reducer(state, { type: ACTIONS.SET_PHASE, phase: 'during' });
    expect(next.phase).toBe('during');
    expect(next.activeSessionId).toBeNull();
  });

  it('SET_ACTIVE_SKILL: cockpit으로 이동하고 before 단계로 시작한다', () => {
    const next = reducer(INITIAL_STATE, {
      type: ACTIONS.SET_ACTIVE_SKILL,
      skillId: 'A-1-1',
    });
    expect(next.activeSkillId).toBe('A-1-1');
    expect(next.screen).toBe('cockpit');
    expect(next.phase).toBe('before');
    expect(next.selectedSkillId).toBeNull();
  });
});

// ── 악보 ───────────────────────────────────────────────────────────────────
describe('악보 관리', () => {
  it('ADD_SCORE: 악보를 추가하고 cockpit/during으로 이동한다', () => {
    const pageData = [{ dataUrl: 'data:image/png;base64,xyz', sessions: [] }];
    const next = reducer(INITIAL_STATE, {
      type: ACTIONS.ADD_SCORE,
      name: '바흐 파르티타',
      pageData,
    });
    expect(next.scores).toHaveLength(1);
    expect(next.scores[0].name).toBe('바흐 파르티타');
    expect(next.activeScoreId).toBe(next.scores[0].id);
    expect(next.screen).toBe('cockpit');
    expect(next.phase).toBe('before'); // 업로드 후 Before 단계에서 시작
  });

  it('ADD_SCORE: 기존 악보 목록 앞에 새 악보가 추가된다', () => {
    const existing = makeScore({ id: 'old-1' });
    const state = { ...INITIAL_STATE, scores: [existing], activeScoreId: 'old-1' };
    const next = reducer(state, {
      type: ACTIONS.ADD_SCORE,
      name: '새 악보',
      pageData: [{ dataUrl: 'data:image/png;base64,new', sessions: [] }],
    });
    expect(next.scores).toHaveLength(2);
    expect(next.scores[0].name).toBe('새 악보');
  });

  it('DELETE_SCORE: 악보를 삭제하고 다음 악보를 활성화한다', () => {
    const s1 = makeScore({ id: 's1', name: '첫번째' });
    const s2 = makeScore({ id: 's2', name: '두번째' });
    const state = { ...INITIAL_STATE, scores: [s1, s2], activeScoreId: 's1' };
    const next = reducer(state, { type: ACTIONS.DELETE_SCORE, scoreId: 's1' });
    expect(next.scores).toHaveLength(1);
    expect(next.activeScoreId).toBe('s2');
  });

  it('DELETE_SCORE: 마지막 악보 삭제 시 activeScoreId가 null이 된다', () => {
    const s1 = makeScore({ id: 's1' });
    const state = { ...INITIAL_STATE, scores: [s1], activeScoreId: 's1' };
    const next = reducer(state, { type: ACTIONS.DELETE_SCORE, scoreId: 's1' });
    expect(next.scores).toHaveLength(0);
    expect(next.activeScoreId).toBeNull();
  });

  it('RENAME_SCORE: 이름만 변경된다', () => {
    const s1 = makeScore({ id: 's1', name: '원래 이름' });
    const state = { ...INITIAL_STATE, scores: [s1], activeScoreId: 's1' };
    const next = reducer(state, {
      type: ACTIONS.RENAME_SCORE,
      scoreId: 's1',
      name: '새 이름',
    });
    expect(next.scores[0].name).toBe('새 이름');
    expect(next.scores[0].id).toBe('s1');
  });
});

// ── 세션 ───────────────────────────────────────────────────────────────────
describe('세션 관리', () => {
  let stateWithScore;

  beforeEach(() => {
    const score = makeScore({ id: 's1' });
    stateWithScore = { ...INITIAL_STATE, scores: [score], activeScoreId: 's1' };
  });

  it('ADD_SESSION: 세션을 추가하고 pickerSessionId를 설정한다', () => {
    const rect = { x: 5, y: 5, w: 40, h: 20 };
    const next = reducer(stateWithScore, { type: ACTIONS.ADD_SESSION, rect });
    const sessions = next.scores[0].sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].rect).toEqual(rect);
    expect(sessions[0].skills).toEqual([]);
    expect(next.pickerSessionId).toBe(sessions[0].id);
    expect(next.activeSessionId).toBe(sessions[0].id);
  });

  it('DELETE_SESSION: 세션을 삭제한다', () => {
    const sess = makeSession({ id: 'sess-1' });
    const score = makeScore({ id: 's1', sessions: [sess] });
    const state = { ...INITIAL_STATE, scores: [score], activeScoreId: 's1', activeSessionId: 'sess-1' };
    const next = reducer(state, { type: ACTIONS.DELETE_SESSION, sessionId: 'sess-1' });
    expect(next.scores[0].sessions).toHaveLength(0);
    expect(next.activeSessionId).toBeNull();
  });

  it('ASSIGN_SKILL: 스킬을 세션에 할당한다', () => {
    const sess = makeSession({ id: 'sess-1' });
    const score = makeScore({ id: 's1', sessions: [sess] });
    const state = { ...INITIAL_STATE, scores: [score], activeScoreId: 's1' };
    const next = reducer(state, {
      type: ACTIONS.ASSIGN_SKILL,
      sessionId: 'sess-1',
      skillId: 'A-1-1',
    });
    expect(next.scores[0].sessions[0].skills).toContain('A-1-1');
  });

  it('ASSIGN_SKILL: 이미 할당된 스킬은 중복 추가되지 않는다', () => {
    const sess = makeSession({ id: 'sess-1', skills: ['A-1-1'] });
    const score = makeScore({ id: 's1', sessions: [sess] });
    const state = { ...INITIAL_STATE, scores: [score], activeScoreId: 's1' };
    const next = reducer(state, {
      type: ACTIONS.ASSIGN_SKILL,
      sessionId: 'sess-1',
      skillId: 'A-1-1',
    });
    expect(next.scores[0].sessions[0].skills).toHaveLength(1);
  });

  it('REMOVE_SKILL: 세션에서 스킬을 제거한다', () => {
    const sess = makeSession({ id: 'sess-1', skills: ['A-1-1', 'B-2-1'] });
    const score = makeScore({ id: 's1', sessions: [sess] });
    const state = { ...INITIAL_STATE, scores: [score], activeScoreId: 's1' };
    const next = reducer(state, {
      type: ACTIONS.REMOVE_SKILL,
      sessionId: 'sess-1',
      skillId: 'A-1-1',
    });
    expect(next.scores[0].sessions[0].skills).toEqual(['B-2-1']);
  });

  it('SELECT_SESSION: 같은 세션 클릭 시 선택 해제된다', () => {
    const state = { ...stateWithScore, activeSessionId: 'sess-1' };
    const next = reducer(state, { type: ACTIONS.SELECT_SESSION, sessionId: 'sess-1' });
    expect(next.activeSessionId).toBeNull();
  });

  it('TOGGLE_CHECK: 체크 키를 토글한다 (추가/제거)', () => {
    const sess = makeSession({ id: 'sess-1' });
    const score = makeScore({ id: 's1', sessions: [sess] });
    const state = { ...INITIAL_STATE, scores: [score], activeScoreId: 's1' };

    const after1 = reducer(state, {
      type: ACTIONS.TOGGLE_CHECK,
      sessionId: 'sess-1',
      key: 'check-A',
    });
    expect(after1.scores[0].sessions[0].checks).toContain('check-A');

    const after2 = reducer(after1, {
      type: ACTIONS.TOGGLE_CHECK,
      sessionId: 'sess-1',
      key: 'check-A',
    });
    expect(after2.scores[0].sessions[0].checks).not.toContain('check-A');
  });
});

// ── 메트로놈 ───────────────────────────────────────────────────────────────
describe('메트로놈', () => {
  it('SET_BPM: BPM을 20~240 범위로 클램핑한다', () => {
    expect(reducer(INITIAL_STATE, { type: ACTIONS.SET_BPM, bpm: 5 }).bpm).toBe(20);
    expect(reducer(INITIAL_STATE, { type: ACTIONS.SET_BPM, bpm: 999 }).bpm).toBe(240);
    expect(reducer(INITIAL_STATE, { type: ACTIONS.SET_BPM, bpm: 120 }).bpm).toBe(120);
  });

  it('SET_METRO_PLAYING: false 시 currentBeat가 -1로 리셋된다', () => {
    const state = { ...INITIAL_STATE, metroPlaying: true, currentBeat: 2 };
    const next = reducer(state, { type: ACTIONS.SET_METRO_PLAYING, playing: false });
    expect(next.metroPlaying).toBe(false);
    expect(next.currentBeat).toBe(-1);
  });
});

// ── 포도 체크 ──────────────────────────────────────────────────────────────
describe('포도 체크', () => {
  it('TOGGLE_GRAPE: 빈 포도 클릭 시 해당 인덱스+1까지 채워진다', () => {
    const state = { ...INITIAL_STATE, grapeTotal: 5, grapeFilled: 0 };
    const next = reducer(state, { type: ACTIONS.TOGGLE_GRAPE, index: 2 });
    expect(next.grapeFilled).toBe(3);
  });

  it('TOGGLE_GRAPE: 채워진 포도 클릭 시 해당 인덱스 이전으로 줄어든다', () => {
    const state = { ...INITIAL_STATE, grapeTotal: 5, grapeFilled: 3 };
    const next = reducer(state, { type: ACTIONS.TOGGLE_GRAPE, index: 1 });
    expect(next.grapeFilled).toBe(1);
  });

  it('RESET_GRAPES: grapeFilled가 0으로 초기화된다', () => {
    const state = { ...INITIAL_STATE, grapeFilled: 7 };
    const next = reducer(state, { type: ACTIONS.RESET_GRAPES });
    expect(next.grapeFilled).toBe(0);
  });

  it('ADJUST_GRAPE_TOTAL: 1~20 범위로 클램핑된다', () => {
    const state = { ...INITIAL_STATE, grapeTotal: 1 };
    expect(reducer(state, { type: ACTIONS.ADJUST_GRAPE_TOTAL, delta: -5 }).grapeTotal).toBe(1);
    const state2 = { ...INITIAL_STATE, grapeTotal: 20 };
    expect(reducer(state2, { type: ACTIONS.ADJUST_GRAPE_TOTAL, delta: 5 }).grapeTotal).toBe(20);
    expect(reducer(INITIAL_STATE, { type: ACTIONS.ADJUST_GRAPE_TOTAL, delta: 3 }).grapeTotal).toBe(13);
  });
});

// ── XP ─────────────────────────────────────────────────────────────────────
describe('XP 시스템', () => {
  it('LOG_XP: success = 30 XP, ok = 15 XP, hard = 5 XP', () => {
    const s1 = reducer(INITIAL_STATE, { type: ACTIONS.LOG_XP, skillId: 'A-1-1', result: 'success' });
    expect(s1.xpLog[0].xp).toBe(30);

    const s2 = reducer(INITIAL_STATE, { type: ACTIONS.LOG_XP, skillId: 'A-1-1', result: 'ok' });
    expect(s2.xpLog[0].xp).toBe(15);

    const s3 = reducer(INITIAL_STATE, { type: ACTIONS.LOG_XP, skillId: 'A-1-1', result: 'hard' });
    expect(s3.xpLog[0].xp).toBe(5);
  });

  it('LOG_XP: 최신 기록이 xpLog 앞에 추가된다', () => {
    const s1 = reducer(INITIAL_STATE, { type: ACTIONS.LOG_XP, skillId: 'A-1-1', result: 'ok' });
    const s2 = reducer(s1, { type: ACTIONS.LOG_XP, skillId: 'B-2-1', result: 'success' });
    expect(s2.xpLog[0].skillId).toBe('B-2-1');
    expect(s2.xpLog[1].skillId).toBe('A-1-1');
  });
});

// ── 불변성 ─────────────────────────────────────────────────────────────────
describe('불변성 보장', () => {
  it('모든 액션은 새 state 객체를 반환해야 한다', () => {
    const actions = [
      { type: ACTIONS.SET_SCREEN, screen: 'library' },
      { type: ACTIONS.SET_PHASE, phase: 'during' },
      { type: ACTIONS.SET_BPM, bpm: 120 },
      { type: ACTIONS.TOGGLE_IMMERSION },
      { type: ACTIONS.RESET_GRAPES },
    ];
    for (const action of actions) {
      const next = reducer(INITIAL_STATE, action);
      expect(next).not.toBe(INITIAL_STATE);
    }
  });

  it('unknown 액션은 같은 state를 반환한다', () => {
    const next = reducer(INITIAL_STATE, { type: '__UNKNOWN__' });
    expect(next).toBe(INITIAL_STATE);
  });
});
