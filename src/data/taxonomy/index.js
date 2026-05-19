// src/data/taxonomy/index.js

import { categoryA } from './categoryA.js';
import { categoryB } from './categoryB.js';
import { categoryC } from './categoryC.js';
import { CATEGORY_META, SKILL_GROUPS } from './constants.js';
import { PREREQUISITES, SYNERGIES } from './connections.js';

export { CATEGORY_META, SKILL_GROUPS };

export const TAXONOMY = [
  ...categoryA,
  ...categoryB,
  ...categoryC,
];

export function getSkillsByCategory(categoryCode) {
  return TAXONOMY.filter(skill => skill.id.startsWith(categoryCode));
}

export function getSkillsByGroup(groupId) {
  return TAXONOMY.filter(skill => skill.groupId === groupId);
}

export function getSkillById(id) {
  return TAXONOMY.find(skill => skill.id === id) ?? null;
}

export function getCategoryCode(skillId) {
  return typeof skillId === 'string' && skillId.length > 0 ? skillId.charAt(0) : 'A';
}

export function getCategoryMeta(skillId) {
  return CATEGORY_META[getCategoryCode(skillId)] ?? CATEGORY_META.A;
}

export const ALL_CATEGORIES = ['전체', ...Object.keys(CATEGORY_META)];

export function getPrerequisites(skillId) {
  return (PREREQUISITES[skillId] ?? []).map(id => getSkillById(id)).filter(Boolean);
}

export function getSynergies(skillId) {
  return (SYNERGIES[skillId] ?? []).map(id => getSkillById(id)).filter(Boolean);
}
