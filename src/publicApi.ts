/**
 * publicApi.ts
 *
 * Exposing functions, classes for end-user/developer to use.
 *
 * @example
 * ```javascript
 * window.mc.$(".selectSomeClass");
 * ```
 */
import { registerCommand, executeCommand } from "./commands";
import { $, $$, $$$, addCss, h } from "./utils/dollars";
import {
	getPluginStickyTypes,
	getPluginStickyModel,
	registerSticky,
	workspace,
} from "./sticky/sticky";
import { n81i } from "./utils/n81i";
import { registerContextMenu } from "./contextMenu";
import { apocalypse } from "./apocalypse";
import { dataset } from "./dataWizard";
import { createDock } from "./dock/dock";

declare global {
	interface Window {
		mc: typeof mc;
		Prism: any;
	}
}

const mc = {
	h,
	$,
	$$,
	$$$,
	n81i,
	addCss,
	dataset,
	createDock,
	apocalypse,
	workspace,
	registerSticky,
	executeCommand,
	registerCommand,
	getPluginStickyModel,
	registerContextMenu,
	getPluginStickyTypes,
};

export function addPublicApi() {
	window.mc = mc;
}
