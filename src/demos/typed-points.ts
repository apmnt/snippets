import type p5 from "p5";
import { p5Demo } from "../p5-demo.js";

export const meta = {
  title: "TypeScript points",
  description:
    "A typed tuple and p5.Vector. Click the canvas to move the point. Try an incorrect type in the editor to see diagnostics.",
  order: 12,
};

type Point = [x: number, y: number];

export default p5Demo((p) => {
  let position: p5.Vector;

  p.setup = () => {
    const startingPoint: Point = [p.width / 2, p.height / 2];
    position = p.createVector(...startingPoint);
    p.noStroke();
  };

  p.mousePressed = () => {
    position?.set(p.mouseX, p.mouseY);
  };

  p.draw = () => {
    p.background("#f0f0ed");
    p.fill("#588cbd");
    p.circle(position.x, position.y, 40);
  };
});
