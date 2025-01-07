export function formToObject<T>(
  form: HTMLFormElement,
  defaultObject?: Record<string, any>,
) {
  const obj = Object.fromEntries(new FormData(form).entries()) as Record<
    string,
    any
  >;
  for (const key of Object.keys(obj)) {
    if (obj[key] === "") {
      // Converts empty string into null.
      obj[key] = null;
    } else if (!isNaN(obj[key])) {
      // Converts number string into number.
      obj[key] = Number(obj[key]);
    }
  }

  if (defaultObject) {
    for (const key of Object.keys(defaultObject)) {
      obj[key] ??= defaultObject[key];
    }
  }

  return obj as T;
}
