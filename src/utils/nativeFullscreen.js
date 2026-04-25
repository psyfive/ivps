export function isNativeFullscreenActive() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement,
  );
}

export async function requestNativeFullscreen(target = null) {
  if (typeof document === 'undefined') return false;

  const el = target ?? document.documentElement;
  if (!el || isNativeFullscreenActive()) return isNativeFullscreenActive();

  const request =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.msRequestFullscreen;

  if (!request) return false;

  try {
    const result = request.call(el, { navigationUI: 'hide' });
    if (result?.then) await result;
    return true;
  } catch {
    return false;
  }
}

export async function exitNativeFullscreen() {
  if (typeof document === 'undefined' || !isNativeFullscreenActive()) return false;

  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;

  if (!exit) return false;

  try {
    const result = exit.call(document);
    if (result?.then) await result;
    return true;
  } catch {
    return false;
  }
}
