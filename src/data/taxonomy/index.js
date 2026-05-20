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

export const SKILL_CART_CATEGORY_ORDER = ['A', 'B', 'C'];

export function getSkillDisplayName(skillOrName) {
  const name = typeof skillOrName === 'string'
    ? skillOrName
    : skillOrName?.name;

  return String(name ?? '').replace(
    /[\s\u00A0]*\((?=[^)]*\p{Script=Latin})(?![^)]*\p{Script=Hangul})[^)]*\)\s*$/u,
    ''
  );
}

function normalizeSkillCartQuery(query) {
  return String(query ?? '').trim().toLowerCase();
}

function matchesSkillCartQuery(skill, query) {
  if (!query) return true;

  return [
    skill.id,
    skill.name,
    skill.corePrinciple,
    skill.groupId,
    skill.sourceGroupId,
    skill.sourceHeading,
  ].some(value => String(value ?? '').toLowerCase().includes(query));
}

export function getSkillCartSubgroupLabel(sourceGroupId) {
  const raw = String(sourceGroupId ?? '').trim();
  if (!raw) return 'Unsorted';
  if (/^[A-C]-\d+$/.test(raw)) return raw;

  return raw
    .replace(/^TECH_/, '')
    .replace(/^BOW_/, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b[a-z]/g, char => char.toUpperCase());
}

export function buildSkillCartHierarchy({ query = '', skills = TAXONOMY } = {}) {
  const normalizedQuery = normalizeSkillCartQuery(query);
  const visibleSkills = skills.filter(skill =>
    SKILL_CART_CATEGORY_ORDER.includes(getCategoryCode(skill.id)) &&
    matchesSkillCartQuery(skill, normalizedQuery)
  );

  return SKILL_CART_CATEGORY_ORDER.map(categoryCode => {
    const groups = SKILL_GROUPS
      .filter(group => group.category === categoryCode)
      .map(group => {
        const groupSkills = visibleSkills.filter(skill => skill.groupId === group.id);
        const subgroupMap = new Map();

        groupSkills.forEach(skill => {
          const subgroupId = skill.sourceGroupId || 'UNSORTED';
          if (!subgroupMap.has(subgroupId)) {
            subgroupMap.set(subgroupId, {
              id: subgroupId,
              label: getSkillCartSubgroupLabel(subgroupId),
              skills: [],
            });
          }
          subgroupMap.get(subgroupId).skills.push(skill);
        });

        return {
          ...group,
          skills: groupSkills,
          subgroups: [...subgroupMap.values()].filter(subgroup => subgroup.skills.length > 0),
        };
      })
      .filter(group => group.skills.length > 0);

    return {
      code: categoryCode,
      meta: CATEGORY_META[categoryCode],
      groups,
      skills: groups.flatMap(group => group.skills),
    };
  }).filter(category => category.skills.length > 0 || !normalizedQuery);
}

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
