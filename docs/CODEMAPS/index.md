# CODEMAPS — 파일별 역할 & 의존 관계

전체 `src/` 디렉토리의 파일 목록, 역할, 의존 관계를 정리한 인덱스.

## 빠른 탐색

| 분류 | 파일 |
|---|---|
| 진입점 | [App.jsx / main.jsx](#진입점) |
| 상태 관리 | [usePracticeSession.js](#hooks) · [PracticeContext.jsx](#context) |
| 레이아웃 | [AppShell / LeftNav / RightUtilPanel / ThemeToggle](#layout) |
| 화면 | [DashboardView / LibraryView / CockpitView](#화면-컴포넌트) |
| 악보 | [ScoreViewer.jsx](#score) |
| Phase 패널 | [CognitiveBriefing / PracticeHUD / DiagnosticInterface](#phases) |
| 데이터 | [taxonomyData.js](#data) |
| 오디오 훅 | [useMetronome / useTuner / useTheme](#hooks) |
| 테스트 | [src/test/](#test) |

---

## 진입점

### `src/main.jsx`
- **역할**: React DOM 루트 마운트. `App` 컴포넌트 렌더링.
- **의존**: `App.jsx`, `index.css`

### `src/App.jsx`
- **역할**: 최상위 컴포넌트. `PracticeProvider`로 전역 상태 주입. `ThemeToggle` fixed 배치.
- **의존**: `PracticeContext`, `AppShell`, `ThemeToggle`

---

## context/

### `src/context/PracticeContext.jsx`
- **역할**: `usePracticeSession` 훅의 반환값을 Context로 전달하는 얇은 브릿지.
- **export**: `PracticeProvider`, `usePractice`
- **의존**: `usePracticeSession`
- **사용처**: 모든 컴포넌트 (`usePractice()` 호출)

### `src/context/ThemeContext.jsx`
- **역할**: 다크/라이트 테마 상태를 전역 제공.
- **export**: `ThemeProvider`, `useThemeContext`
- **의존**: 없음
- **사용처**: `useTheme.js`, `ThemeToggle.jsx`

---

## hooks/

### `src/hooks/usePracticeSession.js` ★ 핵심
- **역할**: 앱 전체 비즈니스 로직. `useReducer` 기반 단일 상태 트리.
- **export**: `usePracticeSession`, `ACTIONS`, `INITIAL_STATE`, `reducer`
- **줄 수**: 477줄
- **의존**: `taxonomyData.js` (`getSkillById`)
- **상태 도메인**: 네비게이션, 스킬, 악보(Score), 세션(Session), 메트로놈, 튜너, 포도체크, XP, UI

### `src/hooks/useMetronome.js`
- **역할**: Web Audio API 기반 메트로놈. BPM/박자/재생 제어.
- **export**: `useMetronome`
- **줄 수**: 109줄
- **의존**: React (`usePractice` 통해 간접 의존)
- **사용처**: `RightUtilPanel.jsx`

### `src/hooks/useTuner.js`
- **역할**: 마이크 입력 → FFT → 크로매틱 음정/센트 계산.
- **export**: `useTuner`
- **줄 수**: 192줄
- **의존**: 없음 (Web API만 사용)
- **사용처**: `RightUtilPanel.jsx`

### `src/hooks/useTheme.js`
- **역할**: `ThemeContext`를 읽어 테마 토글 기능 제공.
- **export**: `useTheme`
- **의존**: `ThemeContext`
- **사용처**: `ThemeToggle.jsx`

---

## layout/

### `src/components/layout/AppShell.jsx`
- **역할**: 전체 앱 레이아웃 골격. screen 값에 따라 메인 컨텐츠 전환.
- **줄 수**: 38줄
- **의존**: `PracticeContext`, `LeftNav`, `RightUtilPanel`, `DashboardView`, `LibraryView`, `CockpitView`, `SkillDetailModal`

### `src/components/layout/LeftNav.jsx`
- **역할**: 좌측 아이콘 네비게이션 사이드바. Dashboard / Library / Cockpit 전환.
- **줄 수**: 56줄
- **의존**: `PracticeContext`

### `src/components/layout/RightUtilPanel.jsx`
- **역할**: 우측 유틸리티 패널 (Cockpit에서만 표시). 메트로놈 + 튜너 + 설정 UI.
- **줄 수**: 325줄
- **의존**: `PracticeContext`, `useMetronome`, `useTuner`

### `src/components/layout/ThemeToggle.jsx`
- **역할**: fixed 위치 다크/라이트 토글 버튼.
- **줄 수**: 70줄
- **의존**: `useTheme`

---

## 화면 컴포넌트

### `src/components/dashboard/DashboardView.jsx`
- **역할**: 홈 화면. 악보 갤러리(썸네일 그리드 + 업로드) + 오늘의 통계(XP, 최근 스킬).
- **줄 수**: 520줄
- **의존**: `PracticeContext`, `taxonomyData`
- **주의**: `fileToPageData` 함수가 `ScoreViewer.jsx`와 중복 — 추후 `src/utils/`로 추출 권장

### `src/components/library/LibraryView.jsx`
- **역할**: 스킬 카탈로그 브라우저. 카테고리 필터 + 스킬 카드 그리드.
- **줄 수**: 308줄
- **의존**: `PracticeContext`, `taxonomyData`

### `src/components/library/SkillDetailModal.jsx`
- **역할**: 스킬 카드 클릭 시 표시되는 상세 모달. Before/During/After 탭 포함.
- **줄 수**: 230줄
- **의존**: `PracticeContext`, `taxonomyData`
- **사용처**: `AppShell.jsx`

### `src/components/cockpit/CockpitView.jsx`
- **역할**: 연습 조종석. TopBar(Phase 탭 + 몰입 토글) + ScoreViewer + Phase 패널.
- **줄 수**: 200줄
- **의존**: `PracticeContext`, `taxonomyData`, `ScoreViewer`, `CognitiveBriefing`, `PracticeHUD`, `DiagnosticInterface`

---

## score/

### `src/components/score/ScoreViewer.jsx` ⚠️ 크기 초과
- **역할**: 악보 렌더링 핵심 컴포넌트.
  - 이미지/PDF 파일 업로드 (드래그앤드롭 + 클릭)
  - PDF 다중 페이지 변환 (pdf.js CDN)
  - 악보 위 드래그로 Session 구간 생성
  - Session 클릭/선택/삭제/스킬 할당
  - PDF 페이지네이션
- **줄 수**: 832줄 (800줄 제한 초과)
- **의존**: `PracticeContext`, `taxonomyData`
- **개선 방향**: `UploadZone`, `SessionLayer`, `PageNavigation` 등으로 분리 고려

---

## phases/

### `src/components/phases/CognitiveBriefing.jsx`
- **역할**: Before 패널. 핵심 원리(corePrinciple) + 감각 가이드(before 필드) 표시.
- **줄 수**: 229줄
- **의존**: `PracticeContext`, `taxonomyData`

### `src/components/phases/PracticeHUD.jsx`
- **역할**: During 패널. 포도 체크 + 집중 카운터 UI.
- **줄 수**: 282줄
- **의존**: `PracticeContext`

### `src/components/phases/DiagnosticInterface.jsx`
- **역할**: After 패널. 세션별 after 진단(증상→원인→처방) + XP 기록.
- **줄 수**: 507줄
- **의존**: `PracticeContext`, `taxonomyData`

---

## data/

### `src/data/taxonomyData.js`
- **역할**: 전체 스킬 데이터 정의. 4 카테고리, 18 그룹, 60+ 스킬.
- **export**:
  - `CATEGORY_META` — 카테고리 색상/레이블
  - `SKILL_GROUPS` — 그룹 메타
  - `TAXONOMY` — 전체 스킬 배열
  - `getSkillById(id)` — ID로 스킬 조회
  - `getCategoryMeta(skillId)` — 스킬 ID에서 카테고리 메타 추출
- **의존**: 없음 (순수 데이터)
- **사용처**: 거의 모든 컴포넌트

---

## styles/

### `src/styles/themes.css`
- **역할**: 다크/라이트 테마 CSS 변수 정의.
- **주요 변수**: `--ivps-bg`, `--ivps-surface`, `--ivps-nav`, `--ivps-border`, `--ivps-text1~4`, `--ivps-gold`
- **선택자**: `body.dark` / `body.light`

### `src/index.css`
- **역할**: 전역 스타일 + Tailwind 지시자 + 기본 리셋.

---

## test/

### `src/test/reducer.test.js`
- **역할**: `usePracticeSession` reducer 단위 테스트 (25개).
- **커버 범위**: 네비게이션, 악보 CRUD, 세션 CRUD, 메트로놈, 포도 체크, XP, 불변성
- **의존**: `vitest`, `usePracticeSession`

---

## 의존 관계 다이어그램

```
taxonomyData.js (순수 데이터, 의존 없음)
    ├── usePracticeSession.js
    ├── DashboardView.jsx
    ├── LibraryView.jsx
    ├── SkillDetailModal.jsx
    ├── CockpitView.jsx
    ├── ScoreViewer.jsx
    ├── CognitiveBriefing.jsx
    └── DiagnosticInterface.jsx

usePracticeSession.js
    └── PracticeContext.jsx
            └── usePractice() ← 모든 컴포넌트

App.jsx
    ├── PracticeContext.jsx (PracticeProvider)
    └── AppShell.jsx
            ├── LeftNav.jsx
            ├── RightUtilPanel.jsx ─── useMetronome.js
            │                     └── useTuner.js
            ├── DashboardView.jsx
            ├── LibraryView.jsx
            ├── CockpitView.jsx ──── ScoreViewer.jsx
            │                   ├── CognitiveBriefing.jsx
            │                   ├── PracticeHUD.jsx
            │                   └── DiagnosticInterface.jsx
            └── SkillDetailModal.jsx
```
