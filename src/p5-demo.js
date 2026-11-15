import p5 from "p5";
import { getValidLanguages } from "./p5-locale.js";

// Sanitize only p5's error-message locales; leave browser preferences alone.
p5.FES.languageCode = getValidLanguages(globalThis.navigator?.languages);

const squareSize = (width, height) => Math.max(1, Math.min(width, height));

/**
 * Give every sketch its own instance, canvas, and animation lifecycle.
 * @param {(p: p5) => void} sketch
 * @returns {(container: HTMLElement) => () => void}
 */
export function p5Demo(sketch) {
  return (container) => {
    const instance = new p5((p) => {
      sketch(p);
      const setup = p.setup;
      p.setup = () => {
        const size = squareSize(container.clientWidth, container.clientHeight);
        p.createCanvas(size, size);
        return setup?.();
      };
    }, container);

    const resize = new ResizeObserver(() => {
      const size = squareSize(container.clientWidth, container.clientHeight);
      if (
        instance.canvas &&
        (instance.width !== size || instance.height !== size)
      ) {
        instance.resizeCanvas(size, size);
      }
    });
    resize.observe(container);

    return () => {
      resize.disconnect();
      instance.remove();
    };
  };
}
