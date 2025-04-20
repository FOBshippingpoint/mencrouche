/**
 * Serializes the attributes of an HTML or SVG element into an object with a nested `dataset` field.
 *
 * @param element - The element from which to extract attributes.
 * @param extraAttrs - Optional list of regular attributes to include.
 * @returns An object with `dataset` for data-* attributes, and other specified attributes at top level.
 */
export function bakeBean(
	element: HTMLElement,
	...extraAttrs: string[]
): Record<string, unknown> {
	const result: Record<string, unknown> = {
		dataset: { ...element.dataset },
	};

	for (const attr of extraAttrs) {
		if (element.hasAttribute(attr)) {
			result[attr] = element.getAttribute(attr);
		}
	}

	return result;
}

/**
 * Populates an element’s attributes from a bean object with a nested `dataset` field.
 *
 * @param element - The element to apply attributes to.
 * @param bean - The object to apply. `dataset` keys go to data-* attributes; others are regular.
 */
export function soakBean(
	element: HTMLElement,
	bean: Record<string, unknown>,
): void {
	const { dataset = {}, ...attrs } = bean;

	for (const [key, value] of Object.entries(attrs)) {
		if (value === null || value === undefined) continue;

		if (key === "class" || key === "className") {
			element.className = value.toString();
		} else if (typeof value === "boolean") {
			if (value) {
				element.setAttribute(key, "");
			} else {
				element.removeAttribute(key);
			}
		} else {
			element.setAttribute(key, value.toString());
		}
	}

	if (
		typeof dataset === "object" &&
		dataset !== null /* this is funny because typeof null == 'object' */
	) {
		// Clear existing dataset
		for (const key of Object.keys(element.dataset)) {
			delete element.dataset[key as keyof DOMStringMap];
		}
		// Apply new dataset
		for (const [key, value] of Object.entries(dataset)) {
			if (value !== null && value !== undefined) {
				element.dataset[key] = value.toString();
			}
		}
	}
}
