import {
  TraceMap,
  originalPositionFor,
  LEAST_UPPER_BOUND,
} from "@jridgewell/trace-mapping";

export const sketchSource = "snippets-sketch.js";

export function sourcePosition(source, offset) {
  const lines = source.slice(0, offset).split("\n");
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

export function sketchError(cause, event, sourceMap) {
  const message = cause?.message ?? String(cause);
  if (cause?.sketchPosition && !sourceMap)
    return { message, ...cause.sketchPosition };
  // Only use frames from edited code, not p5 or preview implementation frames.
  const frame = cause?.stack?.match(/snippets-sketch\.js:(\d+)(?::(\d+))?/);
  const line =
    cause?.sketchPosition?.line ??
    (frame
      ? Number(frame[1])
      : event?.filename?.endsWith(sketchSource)
        ? event.lineno
        : undefined);
  if (sourceMap && line > 0) {
    const column =
      cause?.sketchPosition?.column ??
      (frame?.[2] ? Number(frame[2]) : event?.colno);
    try {
      const position = originalPositionFor(new TraceMap(sourceMap), {
        line,
        column: column > 0 ? column - 1 : 0,
        ...(column > 0 ? {} : { bias: LEAST_UPPER_BOUND }),
      });
      return {
        message,
        ...(position.line
          ? { line: position.line, column: position.column + 1 }
          : {}),
      };
    } catch {
      return { message };
    }
  }
  // Imports are bridged before execution, so mark the whole original line.
  return { message, ...(line > 0 ? { line } : {}) };
}
