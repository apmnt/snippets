export const sketchSource = "snippets-sketch.js";

export function sourcePosition(source, offset) {
  const lines = source.slice(0, offset).split("\n");
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

export function sketchError(cause, event) {
  const message = cause?.message ?? String(cause);
  if (cause?.sketchPosition) return { message, ...cause.sketchPosition };
  // Only use frames from edited code, not p5 or preview implementation frames.
  const frame = cause?.stack?.match(/snippets-sketch\.js:(\d+)(?::\d+)?/);
  const line = frame
    ? Number(frame[1])
    : event?.filename?.endsWith(sketchSource)
      ? event.lineno
      : undefined;
  // Imports are bridged before execution, so mark the whole original line.
  return { message, ...(line > 0 ? { line } : {}) };
}
