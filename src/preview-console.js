export function formatConsoleLog(values) {
  return values
    .map((value) => {
      const seen = new WeakSet();
      if (typeof value === "string") return value;
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      try {
        return (
          JSON.stringify(value, (_, item) => {
            if (typeof item === "bigint") return `${item}n`;
            if (typeof item === "object" && item !== null) {
              if (seen.has(item)) return "[Circular]";
              seen.add(item);
            }
            return item;
          }) ?? String(value)
        );
      } catch {
        return "[Unserializable value]";
      }
    })
    .join(" ")
    .slice(0, 10000);
}

export function captureConsoleLogs(target, onLog) {
  const original = target.log;
  target.log = function (...values) {
    original.apply(target, values);
    onLog(formatConsoleLog(values));
  };
  return () => {
    target.log = original;
  };
}
