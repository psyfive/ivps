# CLAUDE.md - IVPS 프로젝트 지침

> Claude Code가 이 저장소에서 코딩 작업을 할 때 참고하는 프로젝트별 규칙입니다.
> 마지막 점검: 2026-04-24, `ivps-branch2` 기준.

## 프로젝트 개요

**IVPS (Intelligent Violin Practice System)** 는 바이올린 연주자를 위한 지능형 연습 관리 앱입니다.

- PDF/이미지 악보를 업로드하고, 악보 위에 구간을 지정한다.
- 지정한 구간에 스킬 Taxonomy(A~D 카테고리)를 매핑한다.
- Before(인지 준비) -> During(집중 연습 HUD) -> After(진단/처방) -> Last After(종합 리뷰) 흐름으로 연습을 진행한다.
- 메트로놈, 크로매틱 튜너, 포도 체크 반복 카운터, 악보 필기, XP/세션 기록을 포함한다.

## 현재 스택

| 영역 | 기술 |
|---|---|
| Runtime | React 18.3 + JavaScript `.jsx` |
| Build | Vite 5.4 |
| Styling | Tailwind CSS 3.4 + CSS variables |
| State | `useReducer` + React Context |
| Test | Vitest 4 + v8 coverage |
| Browser APIs | Web Audio API, `getUserMedia`, Canvas, FileReader |
| External loader | PDF.js CDN 동적 로드 |

## 개발 명령어

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run test:coverage
```

`vite.config.js`의 테스트 환경은 `node`입니다. 현재 단위 테스트는 `src/test/reducer.test.js`에서 reducer 중심으로 작성되어 있습니다.

## 현재 디렉토리 구조

```text
src/
├── App.jsx
├── main.jsx
├── index.css
├── styles/
│   └── themes.css
├── context/
│   ├── PracticeContext.jsx
│   └── ThemeContext.jsx
├── hooks/
│   ├── usePracticeSession.js
│   ├── useMetronome.js
│   ├── useTuner.js
│   └── useTheme.js
├── data/
│   └── taxonomy/
│       ├── index.js
│       ├── constants.js
│       ├── connections.js
│       ├── categoryA.js
│       ├── categoryB.js
│       ├── categoryC.js
│       └── categoryD.js
├── utils/
│   └── fileToPageData.js
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx
│   │   ├── LeftNav.jsx
│   │   ├── RightUtilPanel.jsx
│   │   └── ThemeToggle.jsx
│   ├── dashboard/
│   │   ├── DashboardView.jsx
│   │   └── PracticeHeatmap.jsx
│   ├── library/
│   │   ├── LibraryView.jsx
│   │   └── SkillDetailModal.jsx
│   ├── cockpit/
│   │   ├── CockpitView.jsx
│   │   ├── AfterBottomSheet.jsx
│   │   ├── FloatingDiagHandle.jsx
│   │   └── LastAfterPhase.jsx
│   ├── score/
│   │   ├── ScoreViewer.jsx
│   │   ├── SegmentCanvas.jsx
│   │   ├── SegmentHeatmap.jsx
│   │   └── DrawingCanvas.jsx
│   └── phases/
│       ├── CognitiveBriefing.jsx
│       ├── PracticeHUD.jsx
│       ├── DuringMiniControls.jsx
│       ├── TopHUD.jsx
│       └── DiagnosticInterface.jsx
└── test/
    └── reducer.test.js
```

## 앱 아키텍처

```text
main.jsx
  -> App.jsx
    -> PracticeProvider
      -> AppShell
        -> LeftNav
        -> main screen: DashboardView | LibraryView | CockpitView
        -> RightUtilPanel (cockpit에서만, fullscreen/last-after 제외)
        -> SkillDetailModal
```

`PracticeContext.jsx`는 `usePracticeSession()` 값을 그대로 Context로 노출하는 얇은 브릿지입니다. 실제 상태, reducer, 액션 wrapper는 모두 `src/hooks/usePracticeSession.js`에 있습니다.

## 화면/Phase 흐름

`screen` 값:

- `dashboard`: 오늘의 연습, 악보 업로드/갤러리, 증상 진입, 최근 세션, 히트맵
- `library`: 스킬 라이브러리, 카테고리/그룹/검색/증상 필터
- `cockpit`: 악보와 연습 패널이 결합된 메인 조종석

`phase` 값:

- `before`: 악보 구간 설정, 스킬 매핑, CognitiveBriefing
- `during`: 구간 선택, 필기/보잉/텍스트 도구, PracticeHUD, 미니 컨트롤, After bottom sheet
- `after`: 구간별 진단/난이도 기록, SegmentHeatmap, DiagnosticInterface
- `last-after`: 연습 종합 리뷰 화면. `CockpitView`가 `LastAfterPhase`로 조기 반환한다.

`practiceFullscreen`이 true이면 LeftNav/RightUtilPanel/PhasePanel 일부가 숨겨지고 악보 중심 During UI가 된다.

## 핵심 상태 구조

상태 추가 시 반드시 `INITIAL_STATE`, `ACTIONS`, `reducer`, `usePracticeSession()`의 액션 wrapper/반환 namespace를 함께 갱신합니다.

```js
state = {
  screen, phase,
  activeSkillId, selectedSkillId,
  scores, activeScoreId,
  activeSessionId, pickerSessionId,
  bpm, beatsPerBar, metroPlaying, currentBeat,
  subdivision, ghostTrainBars, ghostTrainReadyBars,
  tunerActive, tunerNote,
  grapeTotal, grapeFilled, grapeBpmIncrement,
  xpLog,
  skillCart,
  isSelectingSegment, selectedSegmentId, addingToSegmentId, tempSegments,
  drawingMode, drawingTool, drawingColor, drawingFontSize,
  practiceFullscreen,
  reviewSegmentIndex,
  practiceSessions, duringStartTime,
  isPatron,
  activeInstrument,
  symptomFilter,
}
```

액션 namespace:

| namespace | 역할 |
|---|---|
| `nav` | 화면/phase 전환, Last After 진입/종료 |
| `skill` | 스킬 모달, 증상 필터 |
| `score` | 악보 추가/선택/삭제/이름 변경/페이지 이동 |
| `session` | 구형 rect 세션 생성/선택/스킬 할당 |
| `cart` | Before phase 스킬 cart |
| `segment` | 현재 주력 구간 모델 생성/편집/스킬 매핑/난이도/목표 BPM |
| `drawing` | 필기 stroke 추가/삭제/undo/도구 설정 |
| `metro` | BPM, 박자, subdivision, ghost train 설정 |
| `tuner` | 튜너 활성화와 감지 음 |
| `grape` | 반복 체크 카운터 |
| `settings` | 포도 체크 BPM 증가폭, 악기 |
| `xp` | 연습 결과 XP 기록 |
| `ui` | `practiceFullscreen` |

## Score/Segment/Drawing 모델

```js
Score = {
  id, name, dataUrl, uploadedAt,
  sessions: Session[],        // 구형 rect 세션. 현재 페이지 단위.
  segments: Segment[],        // 현재 주력 구간 모델. cross-page coordinates 지원.
  drawings: Stroke[],         // pageIndex별 악보 필기.
  pageData: PageData[],
  currentPageIndex,
}

PageData = {
  dataUrl,
  sessions: Session[],
}

Session = {
  id,
  rect: { x, y, w, h },       // % 단위
  skills: string[],
  checks: string[],
}

Segment = {
  id,
  coordinates: [{ pageIndex, x, y, width, height }],
  measures: { start, end },
  mappedSkills: string[],
  checks: string[],
  targetBpm: number | null,
  targetReps: number | null,
  difficulty?: 'hard' | string,
  pageIndex,
}

Stroke = {
  id,
  tool: 'pen' | 'downBow' | 'upBow' | 'eraser' | 'text',
  color,
  strokeWidth,
  points: [{ x, y }],
  text?: string,
  pageIndex,
}
```

`CHANGE_PAGE`/`SET_PAGE`는 현재 `score.sessions`를 `pageData[currentPageIndex].sessions`에 저장한 뒤 새 페이지의 sessions/dataUrl을 로드합니다. `segments`와 `drawings`는 score 레벨에 두고 각 항목의 `pageIndex`로 렌더링을 필터링합니다.

## 악보 업로드/PDF 처리

`src/utils/fileToPageData.js`가 이미지/PDF 파일을 `{ name, pages }`로 변환합니다.

- 이미지: FileReader로 data URL 생성
- PDF: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js`를 동적 로드한 뒤 페이지별 canvas 렌더링
- Dashboard 업로드에는 50MB 제한이 있다.
- 오프라인 환경에서는 PDF.js CDN 때문에 PDF 업로드가 실패할 수 있다.

예전 지침의 “`fileToPageData`가 DashboardView/ScoreViewer에 중복됨”은 더 이상 맞지 않습니다. 이미 `src/utils/fileToPageData.js`로 추출되어 있습니다.

## Taxonomy 구조

Taxonomy는 더 이상 `src/data/taxonomyData.js` 단일 파일이 아닙니다.

- 진입점: `src/data/taxonomy/index.js`
- 카테고리 데이터: `categoryA.js` ~ `categoryD.js`
- 메타/그룹: `constants.js`
- 선행/시너지 관계: `connections.js`

주요 export:

- `TAXONOMY`
- `CATEGORY_META`
- `SKILL_GROUPS`
- `getSkillById(id)`
- `getSkillsByCategory(categoryCode)`
- `getSkillsByGroup(groupId)`
- `getCategoryMeta(skillId)`
- `getPrerequisites(skillId)`
- `getSynergies(skillId)`
- `getXpPercent(skill)`

스킬 필드는 `id`, `groupId`, `name`, `level`, `xp`, `maxXp`, `corePrinciple`, `before`, `during`, `after`를 기본으로 보며, 최근 커밋에서 멀티미디어 활용 가능성을 고려한 taxonomy 확장이 들어왔습니다.

## UI/스타일 규칙

- 전역 스타일은 `src/index.css`, 테마 변수는 `src/styles/themes.css`에 둔다.
- `body.dark` / `body.light` 기반 CSS variable 테마를 사용한다.
- Tailwind utility와 CSS variable, 제한적인 inline style을 혼용하는 기존 패턴을 따른다.
- `src/App.css`, 기본 Vite/React assets, `EyeAnchorOverlay.jsx`는 최근 refactor-clean에서 제거되었으므로 되살리지 않는다.
- 새 컴포넌트는 기능 폴더 안에 둔다. 단순 분리는 우선 기존 파일 내부 helper 컴포넌트 패턴을 따른다.

## 최근 커밋에서 확인한 방향

최근 HEAD:

- `2408518 refactor-clean (usepracticesession.js 쪽)`: `usePracticeSession.js` 불필요 로직 정리, reducer 테스트 소폭 정리
- `a466272 refactor-clean (codex 1)`: `App.css`, 기본 assets, `EyeAnchorOverlay.jsx` 제거, `fileToPageData.js` 추출
- `39cbd8c agents 수정`: `AGENTS.md` 추가
- `941f1c6 pencil ver.5`: DrawingCanvas 텍스트 입력/재편집 개선
- `096b0e2 taxonomy ver.1`: taxonomy 모듈 데이터 확장
- `3bc83de`, `0d767a2`: 오늘의 증상 진입, 대시보드/라이브러리 레이아웃 조정

현재 로컬 브랜치 `ivps-branch2`는 `origin/ivps-branch2`보다 3개 커밋 앞서 있습니다. 작업 중 `everything-claude-code`는 별도 변경 상태로 보이므로, 사용자가 요청하지 않으면 건드리지 않습니다.

## 작업 규칙

1. 기존 패턴 우선: React Context + reducer 구조를 유지한다.
2. reducer는 불변 업데이트만 사용한다. 중첩 score 변경은 기존 `updateActiveScore` helper 패턴을 따른다.
3. 상태 필드를 추가하면 테스트도 최소 1개 이상 보강한다.
4. `segments`가 현재 주력 모델이고 `sessions`는 남아 있는 구형 rect 세션 모델임을 구분한다.
5. 구간/필기 좌표는 0~1 또는 % 단위가 혼재한다. 기존 컴포넌트가 기대하는 단위를 먼저 확인한다.
6. PDF/파일 처리 로직은 `src/utils/fileToPageData.js`에서 수정한다.
7. 메트로놈/튜너의 브라우저 권한과 Web Audio 생명주기를 깨지 않도록 훅 책임을 유지한다.
8. UI를 바꿀 때 fullscreen/last-after에서 LeftNav/RightUtilPanel 숨김 조건을 함께 확인한다.
9. 문서/코드에 오래된 `taxonomyData.js`, `immersionMode`, 중복 `fileToPageData` 설명을 다시 추가하지 않는다.
10. 큰 변경 후에는 최소 `npm run build`와 관련 `npm run test`를 실행한다.
