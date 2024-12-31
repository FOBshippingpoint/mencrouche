/**
 * @module dollars
 *
 * This module provides a simplified, jQuery-like syntax for DOM manipulation.
 * It offers functions for selecting elements, creating new elements, and
 * attaching event listeners.
 */

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
  interface Element {
    $: typeof Element.prototype.querySelector;
    $$<K extends keyof HTMLElementTagNameMap>(
      selectors: K,
    ): HTMLElementTagNameMap[K][];
    $$<K extends keyof SVGElementTagNameMap>(
      selectors: K,
    ): SVGElementTagNameMap[K][];
    $$<K extends keyof MathMLElementTagNameMap>(
      selectors: K,
    ): MathMLElementTagNameMap[K][];
    /** @deprecated */
    $$<K extends keyof HTMLElementDeprecatedTagNameMap>(
      selectors: K,
    ): HTMLElementDeprecatedTagNameMap[K][];
    $$<E extends Element = Element>(selectors: string): E[];
  }
  interface DocumentFragment {
    $: typeof DocumentFragment.prototype.querySelector;
    $$<K extends keyof HTMLElementTagNameMap>(
      selectors: K,
    ): HTMLElementTagNameMap[K][];
    $$<K extends keyof SVGElementTagNameMap>(
      selectors: K,
    ): SVGElementTagNameMap[K][];
    $$<K extends keyof MathMLElementTagNameMap>(
      selectors: K,
    ): MathMLElementTagNameMap[K][];
    /** @deprecated */
    $$<K extends keyof HTMLElementDeprecatedTagNameMap>(
      selectors: K,
    ): HTMLElementDeprecatedTagNameMap[K][];
    $$<E extends Element = Element>(selectors: string): E[];
  }
}

EventTarget.prototype.on = EventTarget.prototype.addEventListener;
EventTarget.prototype.off = EventTarget.prototype.removeEventListener;

Element.prototype.$ = Element.prototype.querySelector;
Element.prototype.$$ = function <T extends Element>(selector: string): T[] {
  return [...this.querySelectorAll<T>(selector)];
};
DocumentFragment.prototype.$ = DocumentFragment.prototype.querySelector;
DocumentFragment.prototype.$$ = function <T extends Element>(selector: string): T[] {
  return [...this.querySelectorAll<T>(selector)];
};

/**
 * Selects a single element from the DOM.
 *
 * @param selectors - Either a CSS selector string or an existing DOM element.
 * @returns The selected element or null if not found.
 */
const $ = document.querySelector.bind(document);

/**
 * Selects multiple elements from the DOM and returns them as an array.
 *
 * @param selectors - Either a CSS selector string or an existing DOM element.
 * @returns An array of the selected elements with additional methods.
 */
const $$ = <T extends Element>(selector: string) => [
  ...document.querySelectorAll<T>(selector),
];

/**
 * Creates a new HTML element with the specified tag name and optional attributes.
 *
 * This is an alias for `document.createElement`.
 *
 * @param tagName - The name of the HTML element to create.
 * @param options - Optional attributes for the element.
 * @returns The created HTML element.
 */
const $$$ = document.createElement.bind(document);

export { $, $$, $$$ };
