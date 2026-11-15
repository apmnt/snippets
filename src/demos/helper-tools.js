import { p5Demo } from "../p5-demo.js";
import { createHelper } from "../helper.js";

export default p5Demo((p) => {
  const helper = createHelper(p);
  p.keyPressed = () => {
    if (p.key.toLowerCase() === "d") helper.enabled = !helper.enabled;
  };
  p.draw = () => {
    p.background("#ffffff");
    const time = p.millis() / 1000;
    const x = p.width / 2 + Math.cos(time) * 100;
    const y = p.height / 2 + Math.sin(time) * 100;
    p.noStroke();
    p.fill("#353530");
    p.circle(x, y, 32);

    // Draw overlays last. All coordinates are relative to the canvas top left.
    helper.grid({ spacing: 50, labels: true });
    helper.axes();
    helper.bounds(x - 16, y - 16, 32, 32);
    helper.point(x, y, "orbiting point");
    helper.vector(x, y, -Math.sin(time) * 50, Math.cos(time) * 50, {
      label: "velocity",
    });
    helper.hud();
  };
});
