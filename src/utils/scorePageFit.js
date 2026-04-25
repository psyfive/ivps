export function fitContainedSize(naturalWidth, naturalHeight, boxWidth, boxHeight, options = {}) {
  const { allowUpscale = true } = options;

  if (naturalWidth <= 0 || naturalHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { width: 0, height: 0, scale: 0 };
  }

  const rawScale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const scale = allowUpscale ? rawScale : Math.min(rawScale, 1);

  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
    scale,
  };
}
