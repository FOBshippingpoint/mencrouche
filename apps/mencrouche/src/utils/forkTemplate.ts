/**
 * Retrieves and clones the first child element of an HTML template element by its ID.
 *
 * This function finds a template element in the DOM using the provided ID,
 * clones its content, and returns the first child element.
 *
 * @param templateId - The ID of the template element to retrieve
 * @returns The first element from the template
 * @throws Error if no template element with the specified ID can be found
 * @throws Error if the template does not have exactly one child element
 *
 * @example
 * ```html
 * <template id="singleFruit">
 *   <div class="orange">orange</div>
 * </template>
 * ```
 * Get a template with a single child directly as that Element
 * ```typescript
 * const singleElement = forkTemplateSingleElement<HTMLDivElement>('singleFruit');
 * singleElement.textContent; // "orange"
 * ```
 */
export function forkTemplate<E extends Element>(templateId: string): E {
	const template = document.querySelector(
		`template#${templateId}`,
	) as HTMLTemplateElement;
	if (!template) {
		throw Error(`Cannot find template element with id [ ${templateId} ]`);
	}
	if (template.content.childElementCount !== 1) {
		throw Error(
			`Template with id [ ${templateId} ] must have exactly one child element`,
		);
	}
	const node = template.content.cloneNode(true) as DocumentFragment;
	return node.firstElementChild as E;
}

/**
 * Retrieves and clones the content of an HTML template element by its ID.
 *
 * This function finds a template element in the DOM using the provided ID,
 * clones its content, and returns a DocumentFragment containing all template content.
 *
 * @param templateId - The ID of the template element to retrieve
 * @returns A DocumentFragment containing all cloned template content
 * @throws Error if no template element with the specified ID can be found
 *
 * @example
 * ```html
 * <template id="fruitList">
 *   <div class="apple">apple</div>
 *   <div class="banana">banana</div>
 * </template>
 * ```
 * Get a template with multiple children as a DocumentFragment
 * ```typescript
 * const fragment = forkTemplateFragment('fruitList');
 * fragment.querySelector(".apple"); // apple div
 * ```
 */
export function forkTemplateFragment(templateId: string): DocumentFragment {
	const template = document.querySelector(
		`template#${templateId}`,
	) as HTMLTemplateElement;
	if (!template) {
		throw Error(`Cannot find template element with id [ ${templateId} ]`);
	}
	return template.content.cloneNode(true) as DocumentFragment;
}
