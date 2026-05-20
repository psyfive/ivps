const CUSTOM_SOURCE_HEADING = '내가 만든 스킬';

function normalizeString(value) {
  return String(value ?? '').trim();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeString).filter(Boolean);
}

function normalizeAfterItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => ({
      symptom: normalizeString(item?.symptom),
      cause: normalizeString(item?.cause),
      prescription: normalizeString(item?.prescription),
    }))
    .filter(item => item.symptom || item.cause || item.prescription);
}

function normalizeResources(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object');
}

export function createCustomSkillId(category, randomUUID = globalThis.crypto?.randomUUID) {
  const safeCategory = ['A', 'B', 'C'].includes(category) ? category : 'A';
  const suffix = typeof randomUUID === 'function'
    ? randomUUID()
    : Math.random().toString(36).slice(2, 12);
  return `${safeCategory}-U-${suffix}`;
}

export function customSkillRowToSkill(row) {
  if (!row) return null;
  const category = normalizeString(row.category) || normalizeString(row.id).charAt(0) || 'A';
  const groupId = normalizeString(row.group_id) || `${category}-1`;

  return {
    id: normalizeString(row.id),
    groupId,
    sourceId: normalizeString(row.id),
    sourceGroupId: groupId,
    sourceHeading: CUSTOM_SOURCE_HEADING,
    sourceLine: null,
    name: normalizeString(row.name),
    corePrinciple: normalizeString(row.core_principle),
    before: normalizeString(row.before_text),
    during: normalizeStringArray(row.during_items),
    after: normalizeAfterItems(row.after_items),
    resources: normalizeResources(row.resources),
    isCustom: true,
    userId: row.user_id ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function customSkillToRow(skill, userId) {
  const category = normalizeString(skill?.category) || normalizeString(skill?.id).charAt(0) || 'A';
  const id = normalizeString(skill?.id) || createCustomSkillId(category);
  const groupId = normalizeString(skill?.groupId ?? skill?.group_id) || `${category}-1`;

  return {
    id,
    user_id: userId,
    category,
    group_id: groupId,
    name: normalizeString(skill?.name),
    core_principle: normalizeString(skill?.corePrinciple ?? skill?.core_principle),
    before_text: normalizeString(skill?.before ?? skill?.before_text),
    during_items: normalizeStringArray(skill?.during ?? skill?.during_items),
    after_items: normalizeAfterItems(skill?.after ?? skill?.after_items),
    resources: normalizeResources(skill?.resources),
    updated_at: new Date().toISOString(),
  };
}
