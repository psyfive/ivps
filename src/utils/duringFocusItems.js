const FOCUS_ITEM_COUNT = 3;

export function getFocusIndexes(itemCount, storedIndexes = null) {
  if (itemCount <= FOCUS_ITEM_COUNT) {
    return Array.from({ length: itemCount }, (_, index) => index);
  }

  const validStored = Array.isArray(storedIndexes)
    ? storedIndexes
        .filter(index => Number.isInteger(index) && index >= 0 && index < itemCount)
        .slice(0, FOCUS_ITEM_COUNT)
    : [];

  if (validStored.length === FOCUS_ITEM_COUNT) {
    return [...validStored].sort((a, b) => a - b);
  }

  return Array.from({ length: FOCUS_ITEM_COUNT }, (_, index) => index);
}

export function pickRandomFocusIndexes(itemCount, previousIndexes = null) {
  if (itemCount <= FOCUS_ITEM_COUNT) {
    return getFocusIndexes(itemCount);
  }

  const previousKey = Array.isArray(previousIndexes)
    ? [...previousIndexes].sort((a, b) => a - b).join(',')
    : null;

  const pickOnce = () => {
    const indexes = Array.from({ length: itemCount }, (_, index) => index);
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes.slice(0, FOCUS_ITEM_COUNT).sort((a, b) => a - b);
  };

  let next = pickOnce();
  if (previousKey && itemCount > FOCUS_ITEM_COUNT) {
    const nextKey = next.join(',');
    if (nextKey === previousKey) next = pickOnce();
  }
  return next;
}
