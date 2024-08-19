export function formToObject(form: HTMLFormElement) {
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

  return obj;
}
