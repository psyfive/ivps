# CLAUDE.md — IVPS 프로젝트 가이드

> Claude Code가 이 프로젝트에서 작업할 때 반드시 읽어야 할 핵심 컨텍스트.

## 프로젝트 개요

**IVPS (Intelligent Violin Practice System)** — 바이올린 연주자를 위한 지능형 연습 관리 앱.

- PDF/이미지 악보를 업로드하고, 악보 위에 드래그로 연습 세션(구간)을 설정한다.
- 스킬 Taxonomy(A~D 카테고리, 60+ 스킬)를 기반으로 각 세션에 연습 목표를 할당한다.
- Before(인지 준비) → During(집중 연습 HUD) → After(진단·처방) 3단계 워크플로로 연습을 진행한다.
- 메트로놈, 크로매틱 튜너, 포도 체크(반복 카운터), XP 시스템을 내장한다.

**스택**: React 18 + Vite 5 + Tailwind CSS 3 (JavaScript / `.jsx`)

---

## 디렉토리 구조

```
src/
├── App.jsx                      # 루트: PracticeProvider + AppShell + ThemeToggle
├── main.jsx                     # 엔트리포인트
├── index.css                    # 전역 CSS (테마 변수 포함)
├── styles/
│   └── themes.css               # 라이트/다크 CSS 변수 정의
├── context/
│   ├── PracticeContext.jsx      # usePracticeSession → Context 브릿지
│   └── ThemeContext.jsx         # 다크/라이트 테마 Context
├── hooks/
│   ├── usePracticeSession.js    # 핵심 상태 관리 (useReducer 기반)
│   ├── useMetronome.js          # Web Audio API 메트로놈
│   ├── useTuner.js              # 마이크 기반 크로매틱 튜너
│   └── useTheme.js              # 테마 토글 훅
├── data/
│   └── taxonomyData.js          # 스킬 데이터 (TAXONOMY, CATEGORY_META, SKILL_GROUPS)
└── components/
    ├── layout/
    │   ├── AppShell.jsx         # 전체 레이아웃 (LeftNav + main + RightUtilPanel)
    │   ├── LeftNav.jsx          # 좌측 아이콘 네비게이션
    │   ├── RightUtilPanel.jsx   # 우측 메트로놈/튜너/설정 패널 (Cockpit에서만 표시)
    │   └── ThemeToggle.jsx      # 다크/라이트 토글 버튼 (fixed 위치)
    ├── dashboard/
    │   └── DashboardView.jsx    # 오늘의 연습 통계 + 악보 갤러리
    ├── library/
    │   ├── LibraryView.jsx      # 스킬 브라우저 (카테고리 필터 + 카드 그리드)
    │   └── SkillDetailModal.jsx # 스킬 상세 모달 (라이브러리 카드 클릭 시)
    ├── cockpit/
    │   └── CockpitView.jsx      # 연습 조종석 (ScoreViewer + Phase 패널)
    ├── score/
    │   └── ScoreViewer.jsx      # 악보 렌더링 + 드래그 세션 생성
    └── phases/
        ├── CognitiveBriefing.jsx  # Before 패널: 핵심 원리 + 감각 가이드
        ├── PracticeHUD.jsx        # During 패널: 포도 체크 + 집중 카운터
        └── DiagnosticInterface.jsx# After 패널: 증상→원인→처방 진단
```

---

## 핵심 상태 구조 (`usePracticeSession.js`)

모든 앱 상태는 단일 `useReducer`로 관리된다. `PracticeContext`를 통해 전역 공유.

```js
state = {
  // 네비게이션
  screen: 'dashboard' | 'library' | 'cockpit',
  phase:  'before' | 'during' | 'after',

  // 스킬
  activeSkillId: string | null,   // 현재 연습 중인 스킬
  selectedSkillId: string | null, // 모달 미리보기용

  // 악보 (Score)
  scores: Score[],        // 업로드된 악보 목록
  activeScoreId: string | null,

  // 메트로놈
  bpm: number,            // 20~240
  beatsPerBar: number,
  metroPlaying: boolean,
  currentBeat: number,    // -1이면 정지

  // 튜너
  tunerActive: boolean,
  tunerNote: { name, cents, freq } | null,

  // 포도 체크 (반복 카운터)
  grapeTotal: number,     // 1~20
  grapeFilled: number,

  // XP
  xpLog: XpEntry[],

  // UI
  immersionMode: boolean, // TopBar 숨김 모드
}
```

### Score 데이터 모델

```js
Score = {
  id: string,
  name: string,
  dataUrl: string,           // 현재 페이지 이미지 dataURL
  uploadedAt: number,
  sessions: Session[],       // 현재 페이지의 세션 목록
  pageData: PageData[],      // 전체 페이지 배열
  currentPageIndex: number,
}

Session = {
  id: string,
  rect: { x, y, w, h },    // 악보 위 드래그 영역 (% 단위)
  skills: string[],          // 할당된 스킬 ID 목록
  checks: string[],          // 완료 체크 키 목록
}
```

---

## 상태 접근 패턴

```jsx
// 컴포넌트에서 상태 읽기
import { usePractice } from '../../context/PracticeContext';

function MyComponent() {
  const { phase, activeSkill, score, session, metro } = usePractice();
  // ...
}
```

반환값은 그룹화된 액션 네임스페이스를 포함한다:

| 네임스페이스 | 액션 예시 |
|---|---|
| `nav` | `navigate(screen)`, `setPhase(phase)`, `goSkillPractice(skillId)` |
| `score` | `addScore(name, pageData)`, `deleteScore(id)`, `changePage(dir)` |
| `session` | `addSession(rect)`, `assignSkill(sessionId, skillId)`, `toggleCheck(sessionId, key)` |
| `metro` | `setBpm(bpm)`, `setMetroPlaying(bool)` |
| `tuner` | `setTunerActive(bool)`, `setTunerNote(note)` |
| `grape` | `toggleGrape(index)`, `resetGrapes()`, `adjustGrapeTotal(delta)` |
| `xp` | `logXp(skillId, result)` — result: `'success' | 'ok' | 'hard'` |
| `ui` | `toggleImmersion()` |

---

## 스킬 Taxonomy

`src/data/taxonomyData.js` 에 정의. 4개 카테고리, 18개 그룹, 60+ 스킬.

| 카테고리 | 색상 | 내용 |
|---|---|---|
| A | `#7ea890` (초록) | 왼손 테크닉 (기초 셋업, 음정, 스케일, 비브라토 등) |
| B | `#d4a843` (황금) | 오른손 테크닉 (활 그립, 톤, Off/On-String 기법) |
| C | `#9b7fc8` (보라) | 음악성 & 표현 (프레이징, 리듬, 호흡) |
| D | `#6b90b8` (파랑) | 환경 & 장비 (악기 세팅, 활 & 현 설정) |

각 스킬은 4개 필드를 가진다:
- `corePrinciple`: 핵심 물리적·음악적 원리 (1문장)
- `before`: 연습 전 인지 준비 텍스트
- `during`: 집중 체크포인트 3개 (배열)
- `after`: 진단 배열 `[{ symptom, cause, prescription }]`

---

## 테마 시스템

CSS 변수 기반 다크/라이트 테마. `src/styles/themes.css`에 정의.

주요 변수: `--ivps-bg`, `--ivps-surface`, `--ivps-nav`, `--ivps-border`, `--ivps-text1~4`, `--ivps-gold`

테마 클래스: `body.dark` / `body.light` (기본: 다크)

---

## 주의사항 & 작업 규칙

1. **새 파일 생성 최소화**: 기존 파일 수정을 우선. 새 컴포넌트는 관련 폴더에 추가.
2. **상태 추가**: `usePracticeSession.js`의 `INITIAL_STATE`와 `ACTIONS`, `reducer`를 함께 수정.
3. **불변성 필수**: reducer 내 모든 업데이트는 스프레드 연산자로 새 객체 반환.
4. **`fileToPageData` 중복**: `DashboardView.jsx`와 `ScoreViewer.jsx`에 동일 로직이 중복됨 — 수정 시 양쪽 모두 반영하거나 `src/utils/`로 추출 고려.
5. **PDF.js**: CDN 동적 로드 방식 (`https://cdnjs.cloudflare.com/...`). 오프라인 환경에서 PDF 업로드 불가.
6. **테스트**: `vitest` 기반. `src/test/` 디렉토리에 작성. reducer는 순수함수라 단위 테스트 용이.
7. **CSS**: Tailwind 유틸리티 + CSS 변수 혼용. 인라인 `style={{ color: ... }}` 사용도 허용 (테마 색상).

---

## 개발 명령어

```bash
npm run dev      # 개발 서버 (Vite HMR)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npx vitest       # 테스트 실행 (vitest 설치 후)
```
