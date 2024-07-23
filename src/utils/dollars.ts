/**
 * @module dollars
 *
 * This module provides a simplified, jQuery-like syntax for DOM manipulation.
 * It offers functions for selecting elements, creating new elements, and
 * attaching event listeners.
 */

/**
 * Represents an HTMLElement with added $ and $$ methods
 */
type Penny<T extends HTMLElement> = T & {
  $: typeof $;
  $$: typeof $$;
};

/**
 * Represents an array of EnhancedHTMLElements with additional methods
 */
interface PennyList<T extends HTMLElement = HTMLElement>
  extends Array<Penny<T>> {
  do: (func: (el: Penny<T>) => void) => void;
  kill: () => void;
}

/**
 * Add $ and $$ for selecting element(s) in this element's scope.
 * @param {HTMLElement} element
 */
function wrap<T extends HTMLElement>(element: T): Penny<T> {
  const penny = {
    $: (selectors: string) => wrap(element.querySelector(selectors) as T),
    $$: (selectors: string) =>
      enhanceNodeList(
        [...element.querySelectorAll(selectors)]
          .filter((el): el is T => el instanceof HTMLElement)
          .map(wrap),
      ),
  };
  return Object.assign(element, penny);
}

/**
 * Enhances an array of EnhancedHTMLElements with additional methods
 * @param {Penny[]} arr
 * @returns {PennyList}
 */
function enhanceNodeList<T extends HTMLElement>(arr: Penny<T>[]): PennyList<T> {
  const enhancedArr = arr as PennyList<T>;
  enhancedArr.do = (func: (el: Penny<T>) => void) => enhancedArr.forEach(func);
  enhancedArr.kill = () => enhancedArr.forEach((el) => el.remove());
  return enhancedArr;
}

/**
 * Selects a single element from the DOM.
 *
 * @param {string | HTMLElement} selectors - Either a CSS selector string or an existing DOM element.
 * @returns {Penny | null} The selected element or null if not found.
 */
export function $<T extends HTMLElement = HTMLElement>(
  selectors: string | T,
): Penny<T> | null {
  if (typeof selectors === "string") {
    const element = document.querySelector<T>(selectors);
    return element ? wrap(element) : null;
  }
  return wrap(selectors);
}

/**
 * Selects multiple elements from the DOM and returns them as an array.
 *
 * @param {string} selectors - Either a CSS selector string or an existing DOM element.
 * @returns {PennyList} An array of the selected elements with additional methods.
 */
export function $$<T extends HTMLElement = HTMLElement>(
  selectors: string,
): PennyList<T> {
  return enhanceNodeList(
    [...document.querySelectorAll<T>(selectors)]
      .filter((el): el is T => el instanceof HTMLElement)
      .map(wrap),
  );
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
): Penny<HTMLElementTagNameMap[K]> {
  return wrap(document.createElement(tagName, options));
}

// Add type declarations for the prototype additions
declare global {
  interface EventTarget {
    on: typeof EventTarget.prototype.addEventListener;
    off: typeof EventTarget.prototype.removeEventListener;
  }
}

EventTarget.prototype.on = EventTarget.prototype.addEventListener;
EventTarget.prototype.off = EventTarget.prototype.removeEventListener;
