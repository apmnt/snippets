export function createGallery(container, previewUrl) {
  const document = container.ownerDocument;
  const window = document.defaultView;
  const records = new Map();

  function redraw(record) {
    const frame = document.createElement("iframe");
    frame.title = `${record.demo.title} canvas`;
    frame.loading = "lazy";
    record.frame = frame;
    frame.src = previewUrl;
    record.stage.replaceChildren(frame);
  }

  function onMessage(event) {
    if (event.origin !== window.location.origin) return;
    const record = [...records.values()].find(
      (item) => item.frame.contentWindow === event.source,
    );
    if (!record) return;
    if (event.data?.type === "preview-ready") {
      record.frame.contentWindow.postMessage(
        { type: "run-demo", id: record.demo.id },
        window.location.origin,
      );
    } else if (event.data?.type === "sketch-error") {
      let error = record.stage.querySelector(".gallery-error");
      if (!error) {
        error = document.createElement("p");
        error.className = "gallery-error";
        error.setAttribute("role", "alert");
        record.stage.append(error);
      }
      error.textContent = event.data.line
        ? `Line ${event.data.line}: ${event.data.message}`
        : event.data.message;
    }
  }

  window.addEventListener("message", onMessage);
  return {
    update(demos) {
      records.clear();
      container.replaceChildren();
      if (!demos.length) {
        const empty = document.createElement("p");
        empty.textContent = "Add a demo to src/demos to get started.";
        container.append(empty);
      }
      for (const demo of demos) {
        const card = document.createElement("section");
        card.className = "gallery-card";
        card.dataset.demo = demo.id;
        card.setAttribute("aria-label", demo.title);
        const stage = document.createElement("div");
        stage.className = "gallery-stage";
        const footer = document.createElement("div");
        footer.className = "gallery-footer";
        const description = document.createElement("p");
        description.textContent = demo.description;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Redraw";
        button.setAttribute("aria-label", `Redraw ${demo.title}`);
        const record = { demo, stage, frame: undefined };
        button.addEventListener("click", () => redraw(record));
        footer.append(description, button);
        card.append(stage, footer);
        container.append(card);
        records.set(demo.id, record);
        redraw(record);
      }
    },
    dispose() {
      window.removeEventListener("message", onMessage);
      records.clear();
      container.replaceChildren();
    },
  };
}
