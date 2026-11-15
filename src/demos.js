// Vite discovers new files automatically, including during development.
const modules = import.meta.glob("./demos/*.js", { eager: true });
const sources = import.meta.glob("./demos/*.js", {
  eager: true,
  query: "?raw",
  import: "default",
});

export const demos = Object.entries(modules)
  .filter(([, module]) => typeof module.default === "function")
  .map(([path, module]) => {
    const id = path.split("/").pop().replace(/\.js$/, "");
    const { title, description = "", order = Infinity } = module.meta ?? {};
    return {
      id,
      title: title ?? id.replace(/[-_]/g, " "),
      description,
      order,
      mount: module.default,
      code: sources[path],
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
