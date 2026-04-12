// src/data/taxonomy/index.js
// 단일 진입점 — 기존 taxonomyData.js 인터페이스를 완전히 유지

import { categoryA } from './categoryA';
import { categoryB } from './categoryB';
import { categoryC } from './categoryC';
import { categoryD } from './categoryD';

import { CATEGORY_META, SKILL_GROUPS } from './constants';
export { CATEGORY_META, SKILL_GROUPS };

export const TAXONOMY = [
  ...categoryA,
  ...categoryB,
  ...categoryC,
  ...categoryD,
];

/** 카테고리 코드로 스킬 필터 */
export function getSkillsByCategory(categoryCode) {
  return TAXONOMY.filter(s => s.id.startsWith(categoryCode));
}

/** 그룹 ID로 스킬 필터 */
export function getSkillsByGroup(groupId) {
  return TAXONOMY.filter(s => s.groupId === groupId);
}

/** ID로 단일 스킬 조회 */
export function getSkillById(id) {
  return TAXONOMY.find(s => s.id === id) ?? null;
}

/** 카테고리 코드 추출 (e.g. "A-1-2" → "A") */
export function getCategoryCode(skillId) {
  return skillId.charAt(0);
}

/** 카테고리 메타 조회 */
export function getCategoryMeta(skillId) {
  return CATEGORY_META[getCategoryCode(skillId)] ?? CATEGORY_META['A'];
}

/** XP% 계산 */
export function getXpPercent(skill) {
  return Math.round((skill.xp / skill.maxXp) * 100);
}

/** 모든 카테고리 목록 (필터용) */
export const ALL_CATEGORIES = ['전체', ...Object.keys(CATEGORY_META)];
