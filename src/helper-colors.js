import {
  ColorSpace,
  HSL,
  HWB,
  Lab,
  LCH,
  OKLab,
  OKLCH,
  P3,
  sRGB,
  parse,
  serialize,
  to,
  toGamut,
} from "colorjs.io/fn";

for (const space of [sRGB, HSL, HWB, Lab, LCH, OKLab, OKLCH, P3]) {
  ColorSpace.register(space);
}

const harmonies = {
  monochromatic: [0],
  analogous: [0],
  complementary: [0, 180],
  "split-complementary": [0, 150, 210],
  triadic: [0, 120, 240],
};

/**
 * @typedef {object} ColorOptions
 * @property {number} [spread=0.2] Variation from 0 (none) to 1 (broad).
 * @property {"monochromatic" | "analogous" | "complementary" | "split-complementary" | "triadic"} [harmony="analogous"] Hue relationship.
 */

function prepare(base, spread, harmony) {
  if (!Number.isFinite(spread) || spread < 0 || spread > 1) {
    throw new RangeError("Color spread must be between 0 and 1.");
  }
  if (!Object.hasOwn(harmonies, harmony)) {
    throw new RangeError(`Unknown color harmony: ${harmony}.`);
  }
  const color = to(parse(String(base)), "oklch");
  const [lightness, chroma, hue] = color.coords;
  return {
    lightness,
    chroma: chroma < 0.00001 ? 0 : chroma,
    hue: Number.isFinite(hue) ? hue : 0,
    alpha: color.alpha,
    offsets: harmonies[harmony],
  };
}

/**
 * Bind color utilities to p5's seeded random generator.
 * @param {() => number} random
 */
export function createColorTools(random) {
  function sample(base, spread, harmony, offset, position) {
    const centered = () => random() * 2 - 1;
    const hueSpread =
      harmony === "monochromatic" ? 0 : harmony === "analogous" ? 60 : 10;
    const hueShift =
      position !== undefined && harmony === "analogous"
        ? position * 45 + centered() * 15
        : centered() * hueSpread;
    const lightnessShift = position ?? centered();
    const lightness = Math.max(
      0,
      Math.min(1, base.lightness + lightnessShift * 0.3 * spread),
    );
    const chroma = Math.max(0, base.chroma * (1 + centered() * 0.5 * spread));
    const hue = (((base.hue + offset + hueShift * spread) % 360) + 360) % 360;
    const color = to(
      { space: "oklch", coords: [lightness, chroma, hue], alpha: base.alpha },
      "srgb",
    );
    return serialize(toGamut(color, { space: "srgb", method: "css" }), {
      format: "hex",
      collapse: false,
    });
  }

  return {
    /**
     * Generate a nearby color as a CSS hex string. Accepts a CSS color or p5.Color.
     * Uses p.randomSeed() and preserves alpha unless opacity is supplied.
     * Independent of helper.enabled.
     * @param {string | import("p5").default.Color} base
     * @param {ColorOptions & {opacity?: number}} [options] Opacity from 0 to 1; defaults to the base alpha.
     * @returns {string}
     */
    randomColor(base, { spread = 0.2, harmony = "analogous", opacity } = {}) {
      const color = prepare(base, spread, harmony);
      if (opacity !== undefined) {
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
          throw new RangeError("Color opacity must be between 0 and 1.");
        }
        color.alpha = opacity;
      }
      const offset = color.offsets[Math.floor(random() * color.offsets.length)];
      return sample(color, spread, harmony, offset);
    },

    /**
     * Generate an ordered palette, dark to light, cycling through harmony hues.
     * Save this result outside p.draw() to avoid flickering each frame.
     * @param {string | import("p5").default.Color} base
     * @param {ColorOptions & {count?: number}} [options]
     * @returns {string[]}
     */
    palette(base, { count = 5, spread = 0.2, harmony = "analogous" } = {}) {
      if (!Number.isSafeInteger(count) || count < 1) {
        throw new RangeError("Palette count must be a positive integer.");
      }
      const color = prepare(base, spread, harmony);
      return Array.from({ length: count }, (_, i) =>
        sample(
          color,
          spread,
          harmony,
          color.offsets[i % color.offsets.length],
          count === 1 ? 0 : (i / (count - 1)) * 2 - 1,
        ),
      );
    },
  };
}
