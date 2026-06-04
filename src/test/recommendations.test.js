import { describe, expect, it } from 'vitest';
import {
  SYMPTOM_CATEGORIES,
  getSymptomCategories,
  getRecommendedSkills,
  getSymptomCategoriesForSkill,
  getSkillById,
} from '../data/taxonomy';

describe('symptom recommendation engine', () => {
  it('exposes a non-trivial set of symptom categories with stable ids', () => {
    const categories = getSymptomCategories();
    expect(categories).toBe(SYMPTOM_CATEGORIES);
    expect(categories.length).toBeGreaterThanOrEqual(8);

    const ids = categories.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length); // 중복 없음
    categories.forEach(c => {
      expect(typeof c.id).toBe('string');
      expect(typeof c.label).toBe('string');
      expect(Array.isArray(c.keywords)).toBe(true);
      expect(Array.isArray(c.preferredGroups)).toBe(true);
    });
  });

  it('recommends real, ranked skills for a known symptom', () => {
    const recs = getRecommendedSkills({ symptomId: 'intonation', limit: 6 });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(6);

    // 모두 실제 스킬이어야 한다
    recs.forEach(rec => {
      expect(getSkillById(rec.skillId)).toBeTruthy();
      expect(rec.score).toBeGreaterThan(0);
      expect(Array.isArray(rec.matchedSymptoms)).toBe(true);
    });

    // 점수 내림차순 정렬
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
  });

  it('surfaces group-appropriate skills (shifting → A-4)', () => {
    const recs = getRecommendedSkills({ symptomId: 'shifting', limit: 8 });
    const groups = recs.map(rec => getSkillById(rec.skillId)?.groupId);
    expect(groups).toContain('A-4');
  });

  it('excludes already-mapped skills', () => {
    const baseline = getRecommendedSkills({ symptomId: 'vibrato', limit: 6 });
    expect(baseline.length).toBeGreaterThan(0);
    const excluded = baseline[0].skillId;

    const filtered = getRecommendedSkills({ symptomId: 'vibrato', limit: 6, excludeIds: [excluded] });
    expect(filtered.map(r => r.skillId)).not.toContain(excluded);
  });

  it('respects the limit', () => {
    const recs = getRecommendedSkills({ symptomId: 'harshTone', limit: 3 });
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it('is safe for unknown symptom ids and empty input', () => {
    expect(getRecommendedSkills({ symptomId: 'does-not-exist' })).toEqual([]);
    expect(getRecommendedSkills({})).toEqual([]);
    expect(getRecommendedSkills()).toEqual([]);
  });

  it('scores custom skills passed via extraSkills', () => {
    const custom = {
      id: 'A-2-CUSTOM',
      groupId: 'A-2',
      name: '커스텀 음정 교정',
      corePrinciple: '음정이 샵 되는 문제를 교정',
      after: [{ symptom: '음정이 항상 샵 된다', cause: '', prescription: '' }],
    };
    const recs = getRecommendedSkills({ symptomId: 'intonation', limit: 20, extraSkills: [custom] });
    expect(recs.map(r => r.skillId)).toContain('A-2-CUSTOM');
  });

  it('maps a skill back to its related symptom categories', () => {
    const recs = getRecommendedSkills({ symptomId: 'shifting', limit: 1 });
    const skillId = recs[0].skillId;
    const categories = getSymptomCategoriesForSkill(skillId);
    expect(categories).toContain('shifting');
  });
});
