// Call these at the end of p.draw() to draw overlays in canvas coordinates.
export function createHelper(p, { enabled = true } = {}) {
  function overlay(draw) {
    if (!helper.enabled) return;
    p.push();
    try {
      p.resetMatrix();
      p.colorMode(p.RGB, 255);
      p.blendMode(p.BLEND);
      p.rectMode(p.CORNER);
      p.ellipseMode(p.CENTER);
      p.strokeWeight(1);
      p.textFont("monospace");
      p.textSize(11);
      p.textStyle(p.NORMAL);
      p.textAlign(p.LEFT, p.TOP);
      draw();
    } finally {
      p.pop();
    }
  }

  function text(label, x, y, color) {
    p.push();
    p.noStroke();
    p.fill(color);
    p.text(String(label), x, y);
    p.pop();
  }

  const helper = {
    enabled,

    grid({
      spacing = 50,
      majorEvery = 5,
      originX = 0,
      originY = 0,
      color = "#d8d8d2",
      majorColor = "#a8a89e",
      labels = false,
    } = {}) {
      if (!Number.isFinite(spacing) || spacing < 1)
        throw new RangeError("Grid spacing must be at least 1 pixel.");
      if (!Number.isInteger(majorEvery) || majorEvery < 1)
        throw new RangeError("Grid majorEvery must be a positive integer.");
      if (!Number.isFinite(originX) || !Number.isFinite(originY))
        throw new RangeError("Grid origin must use finite coordinates.");
      overlay(() => {
        for (let i = Math.ceil(-originX / spacing); ; i++) {
          const x = originX + i * spacing;
          if (x > p.width) break;
          p.stroke(i % majorEvery === 0 ? majorColor : color);
          p.line(x, 0, x, p.height);
          if (labels) text(i * spacing, x + 3, 3, majorColor);
        }
        for (let i = Math.ceil(-originY / spacing); ; i++) {
          const y = originY + i * spacing;
          if (y > p.height) break;
          p.stroke(i % majorEvery === 0 ? majorColor : color);
          p.line(0, y, p.width, y);
          if (labels) text(i * spacing, 3, y + 3, majorColor);
        }
      });
    },

    axes({
      x = p.width / 2,
      y = p.height / 2,
      xColor = "#c44747",
      yColor = "#327c56",
    } = {}) {
      overlay(() => {
        p.stroke(xColor);
        p.line(0, y, p.width, y);
        text("+x", p.width - 20, y + 4, xColor);
        p.stroke(yColor);
        p.line(x, 0, x, p.height);
        text("+y", x + 4, p.height - 16, yColor);
      });
    },

    point(
      x,
      y,
      label = `(${Math.round(x)}, ${Math.round(y)})`,
      { color = "#c44747", size = 6 } = {},
    ) {
      overlay(() => {
        p.stroke(color);
        p.noFill();
        p.circle(x, y, size);
        p.line(x - size, y, x + size, y);
        p.line(x, y - size, x, y + size);
        if (label) text(label, x + size + 4, y + size + 4, color);
      });
    },

    bounds(x, y, width, height, { color = "#8b51ad", label = "" } = {}) {
      overlay(() => {
        p.noFill();
        p.stroke(color);
        p.rect(x, y, width, height);
        if (label) text(label, x + 4, y + 4, color);
      });
    },

    vector(x, y, dx, dy, { color = "#c26b21", scale = 1, label = "" } = {}) {
      overlay(() => {
        const endX = x + dx * scale;
        const endY = y + dy * scale;
        p.stroke(color);
        p.line(x, y, endX, endY);
        const length = Math.hypot(dx * scale, dy * scale);
        if (length > 0) {
          const angle = Math.atan2(endY - y, endX - x);
          const head = Math.min(8, length / 2);
          for (const side of [-1, 1]) {
            const direction = angle + (side * Math.PI) / 6;
            p.line(
              endX,
              endY,
              endX - Math.cos(direction) * head,
              endY - Math.sin(direction) * head,
            );
          }
        }
        if (label) text(label, endX + 5, endY + 5, color);
      });
    },

    hud({ x = 12, y = 12, mouse = true, fps = true } = {}) {
      overlay(() => {
        const lines = [];
        if (fps) lines.push(`FPS: ${p.frameRate().toFixed(1)}`);
        if (mouse)
          lines.push(`Mouse: ${Math.round(p.mouseX)}, ${Math.round(p.mouseY)}`);
        if (!lines.length) return;
        const width = Math.max(...lines.map((line) => p.textWidth(line))) + 16;
        p.noStroke();
        p.fill(255, 255, 255, 230);
        p.rect(x, y, width, lines.length * 16 + 12, 4);
        lines.forEach((line, i) =>
          text(line, x + 8, y + 6 + i * 16, "#333333"),
        );
      });
    },
  };
  return helper;
}
