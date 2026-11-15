// Some Linux browser environments expose "c" from the POSIX locale.
// p5's friendly-error translator requires valid BCP 47 language tags.
export function getValidLanguages(languages = []) {
  const valid = [];
  for (const language of languages) {
    if (typeof language !== "string") continue;
    try {
      valid.push(...Intl.getCanonicalLocales(language));
    } catch {
      // Keep valid preferences even if another entry is malformed.
    }
  }
  return valid.length ? [...new Set(valid)] : ["en"];
}
