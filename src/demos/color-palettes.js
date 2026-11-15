import { p5Demo } from "../p5-demo.js";
import { createHelper } from "../helper.js";

export const meta = {
  title: "color palettes",
  description:
    "Press R to shuffle the base color. Click to regenerate; press 1–5 to compare harmonies. Click the canvas first for keyboard focus.",
  order: 11,
};

export default p5Demo((p) => {
  const helper = createHelper(p);
  let base = "#588cbd";
  const spread = 0.45; // 0 = no variation, 1 = broad variation.
  const harmonies = [
    "monochromatic",
    "analogous",
    "complementary",
    "split-complementary",
    "triadic",
  ];
  let selected = 1;
  let palette;
  let variants;

  function regenerate() {
    const options = { spread, harmony: harmonies[selected] };
    palette = helper.palette(base, { ...options, count: 8 });
    variants = Array.from({ length: 24 }, () =>
      helper.randomColor(base, options),
    );
  }

  p.setup = () => {
    p.textFont("monospace");
    regenerate();
  };
  p.mousePressed = regenerate;
  p.keyPressed = () => {
    if (p.key.toLowerCase() === "r") {
      base = `#${Math.floor(p.random(0x1000000)).toString(16).padStart(6, "0")}`;
      regenerate();
      return;
    }
    const index = Number(p.key) - 1;
    if (Number.isInteger(index) && index >= 0 && index < harmonies.length) {
      selected = index;
      regenerate();
    }
  };

  p.draw = () => {
    p.background("#f0f0ed");
    p.noStroke();
    const margin = 20;
    const width = p.width - margin * 2;
    p.fill("#353530");
    p.textSize(13);
    p.text(`${harmonies[selected]} · spread ${spread}`, margin, 30);
    p.fill(base);
    p.rect(margin, 46, width, 36);
    const swatchWidth = width / palette.length;
    palette.forEach((color, i) => {
      p.fill(color);
      p.rect(margin + i * swatchWidth, 100, swatchWidth + 1, 100);
    });
    p.fill("#353530");
    p.text(`Base: ${base} · R to shuffle`, margin, 222);
    const size = Math.min(width / 8, (p.height - 250) / 3);
    variants.forEach((color, i) => {
      p.fill(color);
      p.circle(
        margin + (((i % 8) + 0.5) * width) / 8,
        235 + (Math.floor(i / 8) + 0.5) * size,
        size * 0.8,
      );
    });
  };
});
