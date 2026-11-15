import { demoMeta } from "./demo-meta.js";

// Vite discovers new files automatically, including during development.
const modules = import.meta.glob("./demos/*.{js,ts}", { eager: true });
const sources = import.meta.glob("./demos/*.{js,ts}", {
  eager: true,
  query: "?raw",
  import: "default",
});

export const demos = Object.entries(modules)
  .filter(([, module]) => typeof module.default === "function")
  .map(([path, module]) => {
    const filename = path.split("/").pop();
    const name = filename.replace(/\.(js|ts)$/, "");
    const {
      title,
      description = "",
      order = Infinity,
    } = demoMeta[filename] ?? {};
    return {
      id: filename,
      filename,
      language: filename.endsWith(".ts") ? "typescript" : "javascript",
      title: title ?? name.replace(/[-_]/g, " "),
      description,
      order,
      mount: module.default,
      code: sources[path],
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
