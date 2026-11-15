export function disablePageZoom(target) {
  const options = { passive: false };
  let lastTap = { time: -Infinity, x: 0, y: 0 };
  const preventGesture = (event) => event.preventDefault();
  const preventPinch = (event) => {
    if (event.touches.length > 1) event.preventDefault();
  };
  const preventDoubleTap = (event) => {
    if (event.touches.length) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const close =
      Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 40;
    if (event.timeStamp - lastTap.time < 350 && close) event.preventDefault();
    lastTap = { time: event.timeStamp, x: touch.clientX, y: touch.clientY };
  };
  const listeners = [
    ["gesturestart", preventGesture],
    ["gesturechange", preventGesture],
    ["touchmove", preventPinch],
    ["touchend", preventDoubleTap],
  ];
  for (const [type, handler] of listeners)
    target.addEventListener(type, handler, options);
  return () => {
    for (const [type, handler] of listeners)
      target.removeEventListener(type, handler, options);
  };
}

if (typeof document !== "undefined") {
  const dispose = disablePageZoom(document);
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}
