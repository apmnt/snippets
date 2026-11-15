import type p5 from "p5";
import { p5Demo } from "../p5-demo.js";
import { createHelper } from "../helper.js";

export default p5Demo((p) => {
  const helper = createHelper(p);

  const rectWidth = 200;
  const rectHeight = 40;

  const randomAngleRange = 0.1;
  const randomXRange = 30;
  const randomYRange = 20;

  const makeStack = (width: number, height: number) =>
    Array.from({ length: 8 }, (_, i) => ({
      x: width / 2 + p.random(0 - randomXRange, 0 + randomXRange),
      y:
        height -
        (i + 1) * 40 -
        100 +
        p.random(0 - randomYRange, 0 + randomYRange),
      angle: p.random(0 - randomAngleRange, 0 + randomAngleRange),
      color: helper.randomColor("#1e5c96", { spread: 0.3 }),
      z: p.random(0, 10),
    }));

  let rectangles: ReturnType<typeof makeStack>;

  p.setup = () => {
    rectangles = makeStack(p.width, p.height);
  };

  p.draw = () => {
    p.background("#ffffff");
    p.noStroke();

    rectangles.forEach(({ x, y, angle, color }) => {
      p.push();
      p.fill(color);
      p.translate(x + rectWidth / 2, y + rectHeight / 2);
      p.rotate(angle);
      p.rect(-rectWidth, -rectHeight / 2, rectWidth, rectHeight);
      p.pop();
    });
  };
});
