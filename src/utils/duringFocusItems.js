const FOCUS_ITEM_COUNT = 3;

export const FOCUS_CATEGORY_ORDER = ['shape', 'feel', 'sound'];

export const FOCUS_CATEGORY_META = {
  shape: {
    label: '모양 확인',
    bg: 'rgba(126,168,144,.13)',
    border: 'rgba(126,168,144,.28)',
    color: '#7ea890',
  },
  feel: {
    label: '느낌 확인',
    bg: 'rgba(155,127,200,.13)',
    border: 'rgba(155,127,200,.28)',
    color: '#9b7fc8',
  },
  sound: {
    label: '소리 확인',
    bg: 'rgba(212,168,67,.13)',
    border: 'rgba(212,168,67,.28)',
    color: '#d4a843',
  },
  general: {
    label: '',
    bg: 'rgba(255,255,255,.08)',
    border: 'rgba(255,255,255,.12)',
    color: 'rgba(255,255,255,.55)',
  },
};

const LABEL_TO_CATEGORY = Object.fromEntries(
  FOCUS_CATEGORY_ORDER.map(category => [FOCUS_CATEGORY_META[category].label, category]),
);

export function parseDuringFocusItem(rawText) {
  const raw = typeof rawText === 'string' ? rawText : '';
  const match = raw.match(/^\s*\[(모양 확인|느낌 확인|소리 확인)\]\s*(.*)$/);
  if (!match) {
    return {
      category: 'general',
      label: '',
      text: raw,
    };
  }

  const category = LABEL_TO_CATEGORY[match[1]] ?? 'general';
  return {
    category,
    label: match[1],
    text: match[2].trim(),
  };
}

function getLegacyFocusIndexes(itemCount, storedIndexes = null) {
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

function getCategoryForIndex(items, index) {
  return parseDuringFocusItem(items[index]).category;
}

function hasOnePerRequiredCategory(items, indexes) {
  if (!Array.isArray(indexes) || indexes.length !== FOCUS_ITEM_COUNT) return false;
  const categories = new Set(indexes.map(index => getCategoryForIndex(items, index)));
  return FOCUS_CATEGORY_ORDER.every(category => categories.has(category));
}

function getFirstIndexesByCategory(items) {
  return FOCUS_CATEGORY_ORDER
    .map(category => items.findIndex(item => parseDuringFocusItem(item).category === category))
    .filter(index => index >= 0);
}

function getBalancedFocusIndexes(items, storedIndexes = null) {
  const itemCount = items.length;
  if (itemCount <= FOCUS_ITEM_COUNT) {
    return getLegacyFocusIndexes(itemCount, storedIndexes);
  }

  const validStored = Array.isArray(storedIndexes)
    ? storedIndexes
        .filter(index => Number.isInteger(index) && index >= 0 && index < itemCount)
        .slice(0, FOCUS_ITEM_COUNT)
    : [];

  if (hasOnePerRequiredCategory(items, validStored)) {
    return FOCUS_CATEGORY_ORDER
      .map(category => validStored.find(index => getCategoryForIndex(items, index) === category))
      .filter(index => index != null);
  }

  const balanced = getFirstIndexesByCategory(items);
  if (balanced.length === FOCUS_ITEM_COUNT) return balanced;

  return getLegacyFocusIndexes(itemCount, storedIndexes);
}

export function getFocusIndexes(itemCountOrItems, storedIndexes = null) {
  if (Array.isArray(itemCountOrItems)) {
    return getBalancedFocusIndexes(itemCountOrItems, storedIndexes);
  }

  return getLegacyFocusIndexes(itemCountOrItems, storedIndexes);
}

function pickLegacyRandomFocusIndexes(itemCount, previousIndexes = null) {
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

function pickBalancedRandomFocusIndexes(items, previousIndexes = null) {
  if (items.length <= FOCUS_ITEM_COUNT) {
    return getBalancedFocusIndexes(items, previousIndexes);
  }

  const previousKey = hasOnePerRequiredCategory(items, previousIndexes)
    ? FOCUS_CATEGORY_ORDER
        .map(category => previousIndexes.find(index => getCategoryForIndex(items, index) === category))
        .join(',')
    : null;

  const indexesByCategory = Object.fromEntries(
    FOCUS_CATEGORY_ORDER.map(category => [
      category,
      items
        .map((item, index) => ({ index, category: parseDuringFocusItem(item).category }))
        .filter(item => item.category === category)
        .map(item => item.index),
    ]),
  );

  if (FOCUS_CATEGORY_ORDER.some(category => indexesByCategory[category].length === 0)) {
    return pickLegacyRandomFocusIndexes(items.length, previousIndexes);
  }

  const pickOnce = () => FOCUS_CATEGORY_ORDER.map(category => {
    const indexes = indexesByCategory[category];
    return indexes[Math.floor(Math.random() * indexes.length)];
  });

  let next = pickOnce();
  if (previousKey && FOCUS_CATEGORY_ORDER.some(category => indexesByCategory[category].length > 1)) {
    const nextKey = next.join(',');
    if (nextKey === previousKey) next = pickOnce();
  }
  return next;
}

export function pickRandomFocusIndexes(itemCountOrItems, previousIndexes = null) {
  if (Array.isArray(itemCountOrItems)) {
    return pickBalancedRandomFocusIndexes(itemCountOrItems, previousIndexes);
  }

  return pickLegacyRandomFocusIndexes(itemCountOrItems, previousIndexes);
}

export function getFocusItems(items = [], storedIndexes = null) {
  return getFocusIndexes(items, storedIndexes)
    .map(index => ({
      index,
      ...parseDuringFocusItem(items[index]),
    }))
    .filter(item => item.text);
}
