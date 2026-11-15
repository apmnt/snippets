import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { sketchImagesPlugin } from "./scripts/sketch-images.js";

export default defineConfig({
  plugins: [sketchImagesPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        gallery: fileURLToPath(new URL("./gallery.html", import.meta.url)),
        preview: fileURLToPath(new URL("./preview.html", import.meta.url)),
        render: fileURLToPath(new URL("./render.html", import.meta.url)),
      },
    },
  },
});
