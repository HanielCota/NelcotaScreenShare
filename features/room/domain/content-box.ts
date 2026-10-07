/** Area taken by the image inside the element (`object-contain`), relative to it. */
export function contentBox(
  box: { width: number; height: number },
  video: { width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  if (!video.width || !video.height) {
    return { left: 0, top: 0, width: box.width, height: box.height };
  }
  const scale = Math.min(box.width / video.width, box.height / video.height);
  const width = video.width * scale;
  const height = video.height * scale;
  return { left: (box.width - width) / 2, top: (box.height - height) / 2, width, height };
}
