export function debounce(
  callback: Function,
  { isLeadingEdge, waitMs }: { isLeadingEdge?: boolean; waitMs?: number } = {
    isLeadingEdge: false,
    waitMs: 3000, // 3 sec delay before saving
  },
) {
  let timeoutId: number | undefined;

  return function (...args: unknown[]) {
    const context = this;
    const isCallNow = isLeadingEdge && !timeoutId;

    clearTimeout(timeoutId);

    timeoutId = window.setTimeout(function () {
      timeoutId = undefined;

      if (!isLeadingEdge) {
        callback.call(context, ...args);
      }
    }, waitMs);

    if (isCallNow) {
      callback.call(context, ...args);
    }
  };
}
