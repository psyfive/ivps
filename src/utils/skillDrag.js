export const SKILL_DRAG_MIME = 'application/x-opus-skill-id';

export function setSkillDragData(event, skillId) {
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(SKILL_DRAG_MIME, skillId);
  event.dataTransfer.setData('text/plain', skillId);
}

export function hasSkillDragData(event) {
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes(SKILL_DRAG_MIME);
}

export function getSkillDragData(event) {
  return event.dataTransfer?.getData(SKILL_DRAG_MIME)
    || event.dataTransfer?.getData('text/plain')
    || null;
}
