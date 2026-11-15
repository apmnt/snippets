// Any demo can use plain DOM, Canvas, WebGL, or another library.
// Return a function that releases its resources when switching away.
export const meta = {
  title: "Canvas",
  description: "Plain JS canvas",
  order: 4,
};

export default function mount(container) {
  const canvas = document.createElement("canvas");
  container.append(canvas);
  const ctx = canvas.getContext("2d");
  let frame;

  function draw(time) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#f0f0ed";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#353530";
    const x = width / 2 + Math.sin(time / 900) * width * 0.25;
    const y = height / 2 + Math.sin(time / 600) * height * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    frame = requestAnimationFrame(draw);
  }

  frame = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frame);
    canvas.remove();
  };
}
