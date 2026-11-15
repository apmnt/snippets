import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "./style.css";
import { demos } from "./demos.js";
import { createGallery } from "./gallery-view.js";

const gallery = createGallery(
  document.querySelector("#gallery"),
  `${import.meta.env.BASE_URL}preview.html`,
);
gallery.update(demos);

if (import.meta.hot) {
  import.meta.hot.accept("./demos.js", (module) => {
    if (module) gallery.update(module.demos);
  });
  import.meta.hot.dispose(() => gallery.dispose());
}
