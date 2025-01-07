/**
 * Serializes the `data-*` attributes of an HTML or SVG element into a plain object.
 *
 * @param element - The HTML or SVG element from which to extract `data-*` attributes.
 * @returns A plain object where the keys correspond to the `data-*` attributes (in camelCase) 
 *          and the values are their string values from the element.
 *
 * @example
 * const div = document.createElement('div');
 * div.dataset.userId = '123';
 * div.dataset.userName = 'Alice';
 * 
 * const bean = bakeBean(div);
 * console.log(bean); // { userId: "123", userName: "Alice" }
 */
export function bakeBean(element: HTMLOrSVGElement): Record<string, string> {
  return { ...element.dataset } as Record<string, string>;
}

/**
 * Populates the `data-*` attributes of an HTML or SVG element using a provided object.
 *
 * @param element - The HTML or SVG element to which `data-*` attributes will be added.
 * @param bean - A plain object containing key-value pairs to set as `data-*` attributes. 
 *               Keys will be converted to `data-*` attributes in camelCase, and values 
 *               will be stringified.
 *
 * @example
 * const div = document.createElement('div');
 * const bean = { userId: 123, userName: "Alice" };
 * 
 * soakBean(div, bean);
 * console.log(div.dataset.userId); // "123"
 * console.log(div.dataset.userName); // "Alice"
 */
export function soakBean(element: HTMLOrSVGElement, bean: Record<string, unknown>): void {
  Object.entries(bean).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      element.dataset[key] = value.toString();
    }
  });
}
