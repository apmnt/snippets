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
