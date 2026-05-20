import { afterEach, describe, expect, it } from 'vitest';
import {
  CATEGORY_META,
  SKILL_CART_CATEGORY_ORDER,
  SKILL_GROUPS,
  TAXONOMY,
  buildSkillCartHierarchy,
  createCustomSkillId,
  customSkillRowToSkill,
  getAllSkills,
  getSkillDisplayName,
  getPrerequisites,
  getSkillById,
  getSkillsByCategory,
  getSkillsByGroup,
  getSynergies,
  setRuntimeCustomSkills,
} from '../data/taxonomy';

afterEach(() => {
  setRuntimeCustomSkills([]);
});

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

  it('maps Supabase custom skill rows into the app skill shape', () => {
    const row = {
      id: 'A-U-test-skill',
      user_id: 'user-1',
      category: 'A',
      group_id: 'A-1',
      name: 'My custom skill',
      core_principle: 'A personal practice idea.',
      before_text: 'Prepare\nNotice',
      during_items: ['[모양 확인] wrist', '[느낌 확인] release'],
      after_items: [{ symptom: 'tight', cause: 'overhold', prescription: 'reset' }],
      resources: [],
      created_at: '2026-05-20T00:00:00.000Z',
      updated_at: '2026-05-20T00:00:00.000Z',
    };

    expect(customSkillRowToSkill(row)).toMatchObject({
      id: 'A-U-test-skill',
      groupId: 'A-1',
      sourceGroupId: 'A-1',
      name: 'My custom skill',
      corePrinciple: 'A personal practice idea.',
      before: 'Prepare\nNotice',
      during: ['[모양 확인] wrist', '[느낌 확인] release'],
      after: [{ symptom: 'tight', cause: 'overhold', prescription: 'reset' }],
      isCustom: true,
      userId: 'user-1',
    });
  });

  it('creates custom skill ids outside the canonical taxonomy id format', () => {
    expect(createCustomSkillId('B', () => 'uuid-1')).toBe('B-U-uuid-1');
    expect(createCustomSkillId('D', () => 'uuid-2')).toBe('A-U-uuid-2');
  });

  it('resolves canonical and runtime custom skills from the merged library', () => {
    const custom = customSkillRowToSkill({
      id: 'C-U-runtime-test',
      user_id: 'user-1',
      category: 'C',
      group_id: 'C-1',
      name: 'Runtime custom skill',
      core_principle: 'Runtime definition',
      before_text: 'Think first',
      during_items: ['Listen'],
      after_items: [{ symptom: 'miss', cause: 'late', prescription: 'slow' }],
      resources: [],
    });

    setRuntimeCustomSkills([custom]);

    expect(getSkillById('A-1-001')?.id).toBe('A-1-001');
    expect(getSkillById('C-U-runtime-test')).toBe(custom);
    expect(getAllSkills()).toHaveLength(TAXONOMY.length + 1);

    const hierarchy = buildSkillCartHierarchy({ query: 'Runtime custom skill' });
    const resultIds = hierarchy.flatMap(category =>
      category.groups.flatMap(group =>
        group.subgroups.flatMap(subgroup => subgroup.skills.map(skill => skill.id))
      )
    );
    expect(resultIds).toEqual(['C-U-runtime-test']);
  });
});
