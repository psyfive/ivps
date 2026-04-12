# IVPS 아키텍처 문서

## 1. 전체 구조 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                          App.jsx                                │
│   PracticeProvider (전역 상태)  +  ThemeToggle (fixed)          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                       AppShell                           │  │
│  │  ┌──────┐  ┌────────────────────────────┐  ┌──────────┐ │  │
│  │  │Left  │  │        main content        │  │ Right    │ │  │
│  │  │Nav   │  │  Dashboard | Library |     │  │ Util     │ │  │
│  │  │      │  │          Cockpit           │  │ Panel    │ │  │
│  │  └──────┘  └────────────────────────────┘  └──────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 화면(Screen) 전환

`state.screen` 값에 따라 main 영역이 전환된다:

| screen | 컴포넌트 | 설명 |
|---|---|---|
| `dashboard` | `DashboardView` | 악보 갤러리 + 오늘의 통계 |
| `library` | `LibraryView` | 스킬 카탈로그 탐색 |
| `cockpit` | `CockpitView` | 연습 메인 화면 |

`RightUtilPanel`은 `cockpit` 화면에서만 표시된다.

---

## 2. 상태 관리 아키텍처

### 레이어 구조

```
usePracticeSession (useReducer)
        │
        ▼
PracticeContext (createContext)
        │
        ▼
usePractice() ← 모든 컴포넌트에서 호출
```

단일 reducer가 모든 앱 상태를 관리한다. Context는 단순 브릿지 역할만 한다.

### 상태 도메인 분리

| 도메인 | 상태 키 | 액션 네임스페이스 |
|---|---|---|
| 네비게이션 | `screen`, `phase` | `nav` |
| 스킬 선택 | `activeSkillId`, `selectedSkillId`, `filterCategory` | `skill` |
| 악보 관리 | `scores`, `activeScoreId` | `score` |
| 세션 | (score 내부) `sessions`, `activeSessionId` | `session` |
| 메트로놈 | `bpm`, `beatsPerBar`, `metroPlaying`, `currentBeat` | `metro` |
| 튜너 | `tunerActive`, `tunerNote` | `tuner` |
| 포도 체크 | `grapeTotal`, `grapeFilled` | `grape` |
| XP | `xpLog` | `xp` |
| UI | `immersionMode` | `ui` |

---

## 3. 3-Phase 연습 워크플로

```
         ┌─────────────┐
         │   BEFORE    │  ← CognitiveBriefing.jsx
         │ 인지 준비   │    핵심 원리 + 감각 가이드
         └──────┬──────┘
                │ 연습 시작
         ┌──────▼──────┐
         │   DURING    │  ← PracticeHUD.jsx
         │ 집중 연습   │    포도 체크 + 타이머 + 메트로놈
         └──────┬──────┘
                │ 연습 종료
         ┌──────▼──────┐
         │    AFTER    │  ← DiagnosticInterface.jsx
         │ 진단 · 처방 │    증상→원인→처방 + XP 기록
         └─────────────┘
```

Phase는 `state.phase`로 관리되며 CockpitView의 TopBar 탭으로 수동 전환도 가능하다.

### CockpitView 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│  TopBar: [← 라이브러리]  [스킬명]  [BEFORE|DURING|AFTER]  [몰입] │
├───────────────────────────────────┬─────────────────────────────┤
│                                   │                             │
│         ScoreViewer               │      Phase 패널             │
│         (flex: 1.7)               │      (flex: 1)             │
│                                   │                             │
│  - 악보 이미지 렌더링             │  Before → CognitiveBriefing │
│  - 드래그로 Session 생성          │  During → PracticeHUD       │
│  - Session 클릭/삭제/스킬할당     │  After  → DiagnosticInterface│
│                                   │                             │
└───────────────────────────────────┴─────────────────────────────┘
```

---

## 4. Score & Session 데이터 모델

### 관계도

```
scores: Score[]
  └── Score
        ├── id, name, uploadedAt
        ├── dataUrl         ← 현재 페이지 이미지
        ├── currentPageIndex
        ├── pageData: PageData[]
        │     └── PageData { dataUrl, sessions: Session[] }
        └── sessions: Session[]  ← 현재 페이지 세션 (pageData와 동기화)
              └── Session
                    ├── id
                    ├── rect: { x, y, w, h }  ← % 단위, 악보 위 드래그 영역
                    ├── skills: string[]       ← 할당된 스킬 ID
                    └── checks: string[]       ← 완료 체크 키
```

### 페이지 전환 시 데이터 동기화

`CHANGE_PAGE` 액션 발생 시:
1. 현재 페이지 세션을 `pageData[currentPageIndex].sessions`에 저장
2. 새 페이지의 `pageData[newIdx].sessions`를 `score.sessions`로 로드

---

## 5. 스킬 Taxonomy 구조

```
TAXONOMY (배열)
  └── Skill
        ├── id: "A-1-1"           ← "카테고리-그룹-순번"
        ├── groupId: "A-1"
        ├── name: "왼손 프레임 & 자세"
        ├── level: number
        ├── xp / maxXp: number
        ├── corePrinciple: string ← 핵심 원리 (1문장)
        ├── before: string        ← 연습 전 인지 준비
        ├── during: string[]      ← 집중 체크포인트 3개
        └── after: Diagnosis[]
              └── { symptom, cause, prescription }
```

헬퍼 함수:
- `getSkillById(id)` → `Skill | undefined`
- `getCategoryMeta(skillId)` → `{ label, color, bg }`

---

## 6. 오디오 시스템

### 메트로놈 (`useMetronome.js`)

- Web Audio API의 `AudioContext`와 `ScriptProcessorNode` 기반
- `setBpm`, `setMetroPlaying`으로 제어
- `SET_CURRENT_BEAT` 액션으로 현재 박자를 상태에 반영 (UI 시각화용)

### 튜너 (`useTuner.js`)

- `getUserMedia`로 마이크 접근
- FFT 분석으로 기본 주파수 추출 → A4=440Hz 기준 음이름/센트 계산
- `tunerNote: { name, cents, freq }` 형태로 상태 업데이트

---

## 7. 테마 시스템

```
ThemeContext
  └── useTheme()
        ├── theme: 'dark' | 'light'
        └── toggleTheme()
              → body에 'dark' / 'light' 클래스 토글
              → CSS 변수가 자동 전환
```

`src/styles/themes.css`에서 `body.dark`와 `body.light` 선택자로 CSS 변수 정의.

---

## 8. 알려진 기술 부채

| 항목 | 위치 | 설명 |
|---|---|---|
| `fileToPageData` 중복 | `DashboardView.jsx`, `ScoreViewer.jsx` | 동일 로직 — `src/utils/fileToPageData.js`로 추출 필요 |
| `ScoreViewer.jsx` 크기 | 832줄 | 800줄 제한 초과 — 드래그/세션/업로드 로직 분리 고려 |
| PDF.js CDN 의존 | `ScoreViewer.jsx` | 오프라인 환경에서 PDF 업로드 불가 |
| 데이터 영속성 없음 | 전체 | 새로고침 시 상태 초기화 — `localStorage` 연동 필요 |
