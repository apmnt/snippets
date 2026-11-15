import assert from "node:assert/strict";
import test from "node:test";
import p5 from "p5/node";
import { parse, to, inGamut } from "colorjs.io/fn";
import { createHelper } from "../src/helper.js";
import { createColorTools } from "../src/helper-colors.js";

const coords = (color) => to(parse(color), "oklch").coords;
const hueDistance = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

test("zero spread reproduces the base and preserves transparency", () => {
  const helper = createColorTools(Math.random);
  assert.equal(helper.randomColor("#588cbd", { spread: 0 }), "#588cbd");
  assert.deepEqual(helper.palette("#588cbd", { spread: 0, count: 3 }), [
    "#588cbd",
    "#588cbd",
    "#588cbd",
  ]);
  const base = new p5.Color(["rgba(100, 150, 200, 0.5)"]);
  const before = base.toString();
  assert.ok(Math.abs(parse(helper.randomColor(base)).alpha - 0.5) < 0.003);
  assert.equal(base.toString(), before);
});

test("p5 randomSeed repeats the palette and disabled overlays do not disable colors", () => {
  const p = Object.create(p5.prototype);
  const helper = createHelper(p, { enabled: false });
  p.randomSeed(123);
  const first = helper.palette("#588cbd", { count: 8 });
  p.randomSeed(123);
  assert.deepEqual(helper.palette("#588cbd", { count: 8 }), first);
  p.randomSeed(456);
  assert.notDeepEqual(helper.palette("#588cbd", { count: 8 }), first);
});

test("increasing spread widens hue and lightness variation", () => {
  const helper = createColorTools(() => 1 - Number.EPSILON);
  const base = "oklch(0.6 0.04 120)";
  const narrow = coords(helper.randomColor(base, { spread: 0.05 }));
  const broad = coords(helper.randomColor(base, { spread: 0.6 }));
  assert.ok(broad[0] - 0.6 > narrow[0] - 0.6);
  assert.ok(hueDistance(broad[2], 120) > hueDistance(narrow[2], 120));
});

test("fixed harmony schemes cycle through their hue anchors", () => {
  const helper = createColorTools(() => 0.5);
  for (const [harmony, offsets] of [
    ["complementary", [0, 180]],
    ["split-complementary", [0, 150, 210]],
    ["triadic", [0, 120, 240]],
  ]) {
    const palette = helper.palette("oklch(0.6 0.08 30)", {
      spread: 0,
      count: offsets.length * 2,
      harmony,
    });
    palette.forEach((color, i) => {
      assert.ok(
        hueDistance(coords(color)[2], 30 + offsets[i % offsets.length]) < 2,
      );
    });
  }
});

test("monochromatic shades keep hue and palettes have ordered lightness", () => {
  const helper = createColorTools(Math.random);
  const palette = helper.palette("oklch(0.6 0.05 100)", {
    count: 8,
    spread: 0.5,
    harmony: "monochromatic",
  });
  const values = palette.map(coords);
  values.forEach((color, i) => {
    assert.ok(hueDistance(color[2], 100) < 2);
    if (i > 0) assert.ok(color[0] > values[i - 1][0]);
  });
});

test("extreme shades stay displayable and neutral bases stay gray", () => {
  const helper = createColorTools(Math.random);
  for (const base of [
    "white",
    "black",
    "#888888",
    "red",
    "blue",
    "color(display-p3 1 0 0)",
  ]) {
    for (const color of helper.palette(base, {
      count: 20,
      spread: 1,
      harmony: "triadic",
    })) {
      assert.match(color, /^#[0-9a-f]{6}$/i);
      assert.equal(inGamut(parse(color), "srgb"), true);
      if (["white", "black", "#888888"].includes(base)) {
        assert.equal(color.slice(1, 3), color.slice(3, 5));
        assert.equal(color.slice(3, 5), color.slice(5, 7));
      }
    }
  }
});

test("invalid options fail clearly", () => {
  const helper = createColorTools(Math.random);
  for (const spread of [-1, 2, NaN, Infinity])
    assert.throws(() => helper.randomColor("red", { spread }), /spread/);
  for (const count of [0, -1, 1.5, Infinity])
    assert.throws(() => helper.palette("red", { count }), /count/);
  assert.throws(
    () => helper.palette("red", { harmony: "constructor" }),
    /harmony/,
  );
  assert.throws(() => helper.randomColor("not a color"));
});
