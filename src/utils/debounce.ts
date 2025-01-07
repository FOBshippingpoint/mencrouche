/**
 * Creates a debounced function that delays invoking callback until after waitMs
 * milliseconds have elapsed since the last time the debounced function was invoked.
 * The callback is invoked with the last arguments provided to the debounced function.
 *
 * @typeParam T - The type of function to debounce
 * @param callback - The function to debounce
 * @param options - The options object
 * @param options.isLeadingEdge - Whether to invoke on the leading edge of the timeout
 * @param options.waitMs - The number of milliseconds to delay
 * @returns A new debounced function
 *
 * @example
 * ```ts
 * // Avoid costly calls while typing
 * const debouncedSave = debounce((text: string) => saveToServer(text));
 * input.addEventListener('input', (e) => debouncedSave(e.target.value));
 * ```
 */
export function debounce(
  callback: Function,
  { isLeadingEdge, waitMs }: { isLeadingEdge?: boolean; waitMs?: number } = {
    isLeadingEdge: false,
    waitMs: 3000, // 3 sec delay before saving
  },
) {
  let timeoutId: number | undefined;

  return (...args: unknown[]) => {
    const isCallNow = isLeadingEdge && !timeoutId;

    clearTimeout(timeoutId);

    timeoutId = window.setTimeout(() => {
      timeoutId = undefined;

      if (!isLeadingEdge) {
        callback(...args);
      }
    }, waitMs);

    if (isCallNow) {
      callback(...args);
    }
  };
}
