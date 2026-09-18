// One 1920x1080 logical stage, uniformly scaled by
// min(hostWidth / 1920, hostHeight / 1080) and centered with
// letterboxing, per the framework display contract. Stage-internal
// geometry and typography use stage coordinates; the canvas backing
// store follows displayed size times device pixel ratio while the
// drawing transform retains logical stage coordinates.
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export function createStage({ root, stage, canvas, getDpr }) {
  let lastScale = 1;

  function fit() {
    const host = root.getBoundingClientRect();
    const scale = Math.min(host.width / STAGE_WIDTH, host.height / STAGE_HEIGHT);
    const displayWidth = STAGE_WIDTH * scale;
    const displayHeight = STAGE_HEIGHT * scale;
    const left = (host.width - displayWidth) / 2;
    const top = (host.height - displayHeight) / 2;

    stage.style.transformOrigin = '0 0';
    stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;

    const dpr = getDpr();
    const logicalWidth = canvas.offsetWidth || 1;
    const logicalHeight = canvas.offsetHeight || 1;
    const displayedWidth = logicalWidth * scale;
    const displayedHeight = logicalHeight * scale;
    const backingWidth = Math.max(1, Math.round(displayedWidth * dpr));
    const backingHeight = Math.max(1, Math.round(displayedHeight * dpr));
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;

    lastScale = scale;
    return {
      scale,
      dpr,
      host: { width: host.width, height: host.height },
      display: { width: displayWidth, height: displayHeight, left, top },
      canvas: { logicalWidth, logicalHeight, backingWidth, backingHeight }
    };
  }

  function info() {
    const dpr = getDpr();
    return {
      scale: lastScale,
      dpr,
      stage: { width: STAGE_WIDTH, height: STAGE_HEIGHT },
      canvas: {
        logicalWidth: canvas.offsetWidth,
        logicalHeight: canvas.offsetHeight,
        backingWidth: canvas.width,
        backingHeight: canvas.height
      },
      drawnScale: canvas.width / (canvas.offsetWidth || 1)
    };
  }

  return { fit, info };
}
