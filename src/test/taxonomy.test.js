import { describe, expect, it } from 'vitest';
import {
  CATEGORY_META,
  SKILL_CART_CATEGORY_ORDER,
  SKILL_GROUPS,
  TAXONOMY,
  buildSkillCartHierarchy,
  getSkillDisplayName,
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

  it('builds the A/B/C skill cart hierarchy from taxonomy metadata', () => {
    const hierarchy = buildSkillCartHierarchy();
    const flattenedIds = hierarchy.flatMap(category =>
      category.groups.flatMap(group =>
        group.subgroups.flatMap(subgroup => subgroup.skills.map(skill => skill.id))
      )
    );

    expect(hierarchy.map(category => category.code)).toEqual(SKILL_CART_CATEGORY_ORDER);
    expect(hierarchy.map(category => category.skills.length)).toEqual([50, 30, 20]);
    expect(new Set(flattenedIds).size).toBe(TAXONOMY.length);
    expect(flattenedIds).toHaveLength(TAXONOMY.length);
    expect(hierarchy.flatMap(category => category.groups.map(group => group.id))).toEqual(
      SKILL_GROUPS.map(group => group.id)
    );
    expect(
      hierarchy.every(category =>
        category.groups.every(group =>
          group.subgroups.every(subgroup =>
            subgroup.skills.every(skill => skill.sourceGroupId === subgroup.id)
          )
        )
      )
    ).toBe(true);
  });

  it('filters empty skill cart hierarchy branches by query', () => {
    const hierarchy = buildSkillCartHierarchy({ query: 'A-1-001' });

    expect(hierarchy).toHaveLength(1);
    expect(hierarchy[0].code).toBe('A');
    expect(hierarchy[0].groups).toHaveLength(1);
    expect(hierarchy[0].groups[0].id).toBe('A-1');
    expect(hierarchy[0].groups[0].subgroups).toHaveLength(1);
    expect(hierarchy[0].groups[0].subgroups[0].skills.map(skill => skill.id)).toEqual(['A-1-001']);
  });

  it('keeps raw skill names searchable while trimming trailing Latin labels for display', () => {
    expect(getSkillDisplayName('데타셰 (Détaché)')).toBe('데타셰');
    expect(getSkillDisplayName('음표 그룹화 (한국어 설명)')).toBe('음표 그룹화 (한국어 설명)');
    expect(getSkillDisplayName('1~2옥타브 스케일')).toBe('1~2옥타브 스케일');

    const hierarchy = buildSkillCartHierarchy({ query: 'Détaché' });
    const resultIds = hierarchy.flatMap(category =>
      category.groups.flatMap(group =>
        group.subgroups.flatMap(subgroup => subgroup.skills.map(skill => skill.id))
      )
    );

    expect(resultIds).toContain('B-7-001');
  });
});
