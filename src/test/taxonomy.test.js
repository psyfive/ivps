import { describe, expect, it } from 'vitest';
import {
  CATEGORY_META,
  SKILL_GROUPS,
  TAXONOMY,
  getPrerequisites,
  getSkillById,
  getSkillsByCategory,
  getSkillsByGroup,
  getSynergies,
} from '../data/taxonomy';

describe('taxonomy library', () => {
  it('loads the rebuilt A/B/C skill set', () => {
    expect(TAXONOMY).toHaveLength(100);
    expect(getSkillsByCategory('A')).toHaveLength(50);
    expect(getSkillsByCategory('B')).toHaveLength(30);
    expect(getSkillsByCategory('C')).toHaveLength(20);
    expect(Object.keys(CATEGORY_META)).toEqual(['A', 'B', 'C']);
  });

  it('keeps skill ids unique and grouped by declared metadata', () => {
    const ids = TAXONOMY.map(skill => skill.id);
    const groupIds = new Set(SKILL_GROUPS.map(group => group.id));

    expect(new Set(ids).size).toBe(ids.length);
    expect(SKILL_GROUPS).toHaveLength(16);
    expect(TAXONOMY.every(skill => groupIds.has(skill.groupId))).toBe(true);
  });

  it('finds skills and groups using the JSON id format', () => {
    const skill = getSkillById('A-1-001');

    expect(skill).toMatchObject({
      id: 'A-1-001',
      groupId: 'A-1',
    });
    expect(getSkillsByGroup('A-1').map(item => item.id)).toContain('A-1-001');
    expect(getSkillById('A-1-1')).toBeNull();
  });

  it('keeps relationship lookups empty until new relations are authored', () => {
    expect(getPrerequisites('A-1-001')).toEqual([]);
    expect(getSynergies('A-1-001')).toEqual([]);
  });
});
