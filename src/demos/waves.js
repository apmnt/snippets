import { p5Demo } from "../p5-demo.js";

export const meta = {
  title: "saves",
  description: "p5.js sine waves",
  order: 2,
};

export default p5Demo((p) => {
  p.draw = () => {
    p.background("#f0f0ed");
    p.noFill();
    p.stroke("#555550");
    const time = p.millis() * 0.0006;

    for (let row = 0; row < 16; row++) {
      p.beginShape();
      for (let x = 0; x <= p.width; x += 4) {
        const wave = p.sin(x * 0.012 + time + row * 0.25);
        const envelope = p.sin((x / p.width) * p.PI);
        p.vertex(x, p.height * (0.2 + row * 0.04) + wave * envelope * 28);
      }
      p.endShape();
    }
  };
});
