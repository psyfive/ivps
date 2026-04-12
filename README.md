# IVPS — Intelligent Violin Practice System

바이올린 연주자를 위한 지능형 연습 관리 웹 앱.

## 주요 기능

- **악보 뷰어**: PDF 및 이미지 파일을 업로드하여 다중 페이지 악보를 렌더링
- **연습 세션 설정**: 악보 위 드래그로 연습 구간을 직접 지정하고 스킬 목표 할당
- **3단계 연습 워크플로**
  - **Before**: 핵심 원리와 감각 가이드로 인지 준비
  - **During**: 포도 체크(반복 카운터) + HUD로 집중 연습
  - **After**: 증상→원인→처방 형식의 자가 진단
- **스킬 라이브러리**: 4개 카테고리(왼손/오른손/음악성/장비), 60+ 스킬로 구성된 Taxonomy
- **내장 도구**: 메트로놈(BPM 20~240), 크로매틱 튜너(마이크), XP 경험치 시스템
- **다크/라이트 테마**: CSS 변수 기반 즉시 전환

## 스크린샷

| 대시보드 | 스킬 라이브러리 | 연습 조종석 |
|---|---|---|
| 악보 갤러리 + 오늘의 통계 | 카테고리별 스킬 탐색 | ScoreViewer + Phase 패널 |

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | React 18 |
| 빌드 도구 | Vite 5 |
| 스타일링 | Tailwind CSS 3 + CSS 변수 |
| 상태 관리 | `useReducer` + Context API |
| PDF 렌더링 | pdf.js 2.16 (CDN 동적 로드) |
| 오디오 | Web Audio API (메트로놈), Web Audio + 마이크 (튜너) |
| 테스트 | Vitest |

## 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:5173)
npm run dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npx vitest
```

## 사용 방법

1. **대시보드**에서 PDF 또는 이미지 악보를 업로드
2. **스킬 라이브러리**에서 오늘 연습할 스킬 선택 → 조종석으로 이동
3. **조종석 > Before** 탭: 핵심 원리 확인 후 악보 위 드래그로 연습 구간 설정
4. **During 탭**: 메트로놈을 켜고 포도 체크로 반복 횟수 기록
5. **After 탭**: 어려웠던 증상을 진단하고 처방 확인, XP 기록

## 프로젝트 구조

자세한 아키텍처 설명은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고하세요.  
파일별 역할 및 의존 관계는 [docs/CODEMAPS/](docs/CODEMAPS/)를 참고하세요.

## 라이선스

Private — All rights reserved.
