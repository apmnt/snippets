import p5 from "p5";
import { getValidLanguages } from "./p5-locale.js";

// Sanitize only p5's error-message locales; leave browser preferences alone.
p5.FES.languageCode = getValidLanguages(globalThis.navigator?.languages);

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
        p.createCanvas(container.clientWidth, container.clientHeight);
        return setup?.();
      };
    }, container);

    const resize = new ResizeObserver(() => {
      if (instance.canvas) {
        instance.resizeCanvas(container.clientWidth, container.clientHeight);
      }
    });
    resize.observe(container);

    return () => {
      resize.disconnect();
      instance.remove();
    };
  };
}
