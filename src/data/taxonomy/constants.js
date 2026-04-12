// src/data/taxonomy/constants.js
// 카테고리 메타데이터 및 스킬 그룹 상수

export const CATEGORY_META = {
  A: { label: "A. 왼손 테크닉",   color: "#7ea890", bg: "rgba(126,168,144,.10)" },
  B: { label: "B. 오른손 테크닉", color: "#d4a843", bg: "rgba(212,168,67,.10)"  },
  C: { label: "C. 음악성 & 표현", color: "#9b7fc8", bg: "rgba(155,127,200,.10)" },
  D: { label: "D. 환경 & 장비",   color: "#6b90b8", bg: "rgba(107,144,184,.10)" },
};

// ── 스킬 그룹 (섹션) 메타 ─────────────────────────────────────────────
export const SKILL_GROUPS = [
  { id: "A-1", name: "기초 셋업",            category: "A" },
  { id: "A-2", name: "음정 (Intonation)",    category: "A" },
  { id: "A-3", name: "스케일 & 아르페지오",  category: "A" },
  { id: "A-4", name: "포지션 & 시프팅",      category: "A" },
  { id: "A-5", name: "비브라토",             category: "A" },
  { id: "A-6", name: "트릴",                 category: "A" },
  { id: "A-7", name: "특수 기법",            category: "A" },
  { id: "A-8", name: "손가락 민첩성",        category: "A" },
  { id: "B-1", name: "활 그립 & 셋업",       category: "B" },
  { id: "B-2", name: "톤 프로덕션",          category: "B" },
  { id: "B-3", name: "활 방향 전환 & 레가토", category: "B" },
  { id: "B-4", name: "Off-String 기법",      category: "B" },
  { id: "B-5", name: "On-String 기법",       category: "B" },
  { id: "C-1", name: "프레이징",             category: "C" },
  { id: "C-2", name: "리듬 & 박자",          category: "C" },
  { id: "C-3", name: "호흡 & 전신 연결",     category: "C" },
  { id: "D-1", name: "악기 세팅",            category: "D" },
  { id: "D-2", name: "활 & 현 설정",         category: "D" },
];
