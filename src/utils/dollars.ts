/**
 * @module dollars
 *
 * This module provides a simplified, jQuery-like syntax for DOM manipulation.
 * It offers functions for selecting elements, creating new elements, and
 * attaching event listeners.
 */

export type Allowance<T extends HTMLElement> = T & {
  $: <K extends HTMLElement>(selectors: string) => Allowance<K> | null;
  $$: <K extends HTMLElement>(selectors: string) => AllowanceList<K>;
};

export type AllowanceList<T extends HTMLElement> = Allowance<T>[] & {
  do: (func: (el: Allowance<T>) => void) => void;
  kill: () => void;
};

/**
 * Add $ and $$ for selecting element(s) in this element's scope.
 * @param element - element to wrap.
 */
function wrap<T extends HTMLElement>(element: T): Allowance<T> {
  const dollars = {
    $<K extends HTMLElement>(selectors: string) {
      const el = element.querySelector<K>(selectors);
      return el ? wrap<K>(el) : null;
    },
    $$<K extends HTMLElement>(selectors: string) {
      return enhanceList<K>(
        ([...element.querySelectorAll<K>(selectors)] as K[]).map(wrap),
      );
    },
  };
  return Object.assign(element, dollars);
}

/**
 * Enhances an array of EnhancedHTMLElements with additional methods
 * @param arr
 * @returns Enahanced list.
 */
function enhanceList<T extends HTMLElement>(
  arr: Allowance<T>[],
): AllowanceList<T> {
  return Object.assign(arr, {
    do(func: (el: Allowance<T>) => void) {
      arr.forEach(func);
    },
    kill() {
      arr.forEach((el) => el.remove());
    },
  });
}

/**
 * Selects a single element from the DOM.
 *
 * @param selectors - Either a CSS selector string or an existing DOM element.
 * @returns The selected element or null if not found.
 */
export function $<T extends HTMLElement>(
  selectors: string | T,
): Allowance<T> | null {
  if (typeof selectors === "string") {
    const element = document.querySelector<T>(selectors);
    return element ? wrap(element) : null;
  }
  return wrap(selectors);
}

/**
 * Selects multiple elements from the DOM and returns them as an array.
 *
 * @param selectors - Either a CSS selector string or an existing DOM element.
 * @returns An array of the selected elements with additional methods.
 */
export function $$<T extends HTMLElement>(selectors: string): AllowanceList<T> {
  return enhanceList([...document.querySelectorAll<T>(selectors)].map(wrap));
}

/**
 * Creates a new HTML element with the specified tag name and optional attributes.
 *
 * This is an alias for `document.createElement`.
 *
 * @param tagName - The name of the HTML element to create.
 * @param options - Optional attributes for the element.
 * @returns The created HTML element.
 */
export function $$$<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: ElementCreationOptions,
): Allowance<HTMLElementTagNameMap[K]> {
  return wrap(document.createElement(tagName, options));
}

// Add type declarations for the prototype additions
declare global {
  interface EventTarget {
    on: typeof EventTarget.prototype.addEventListener;
    off: typeof EventTarget.prototype.removeEventListener;
  }
  interface HTMLElement {
    on: typeof HTMLElement.prototype.addEventListener;
    off: typeof HTMLElement.prototype.removeEventListener;
  }
  interface Document {
    on: typeof Document.prototype.addEventListener;
    off: typeof Document.prototype.removeEventListener;
  }
}

EventTarget.prototype.on = EventTarget.prototype.addEventListener;
EventTarget.prototype.off = EventTarget.prototype.removeEventListener;
