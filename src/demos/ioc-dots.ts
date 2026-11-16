import { p5Demo } from "../p5-demo.js";
import { createHelper } from "../helper.js";

export default p5Demo((p) => {

  const cols = 10;
  const rows = 24;
  const circleRadius = 10.5;
  const innerRadius = circleRadius * 0.5;
  const backgroundOverflow = 20;

  const diameter = circleRadius * 2;
  const designWidth = cols * diameter + backgroundOverflow * 2;
  const designHeight = rows * diameter + backgroundOverflow * 2;

  const background = "#7D6C48";
  const primary = "#f4eded";
  const secondary = "#9CBD9B";
  const tertiary = "#308c84";

  const outerColors = [primary, secondary, tertiary];
  const innerColors = [primary, secondary, background, tertiary];

  const getColor = (colors: string[], index: number, count: number) =>
    colors[
      Math.min(colors.length - 1, Math.floor((index / count) * colors.length))
    ];

  const makeMatrix = () =>
    Array.from({ length: rows }, (_, row) => {
      const group = Math.floor((row / rows) * outerColors.length);
      const groupStart = Math.ceil((group * rows) / outerColors.length);
      const groupEnd = Math.ceil(((group + 1) * rows) / outerColors.length);
      const outerColor = getColor(outerColors, row, rows);
      const innerColor = getColor(
        innerColors,
        row - groupStart,
        groupEnd - groupStart,
      );

      return Array.from({ length: cols }, (_, col) => ({
        x: backgroundOverflow + circleRadius + col * diameter,
        y: backgroundOverflow + circleRadius + row * diameter,
        outerColor,
        innerColor,
      }));
    });

  const matrix = makeMatrix();

  p.setup = () => {
    const scale = Math.min(p.width / designWidth, p.height / designHeight);

    p.background("#ffffff");
    p.noStroke();
    p.push();
    p.translate(p.width / 2, p.height / 2);
    p.scale(scale);
    p.translate(-designWidth / 2, -designHeight / 2);

    p.fill(background);
    p.rect(0, 0, designWidth, designHeight);

    matrix.flat().forEach(({ x, y, innerColor, outerColor }) => {
      p.fill(outerColor);
      p.circle(x, y, circleRadius * 2);

      p.fill(innerColor);
      p.circle(x, y, innerRadius * 2);
    });
    p.pop();
  };
});
