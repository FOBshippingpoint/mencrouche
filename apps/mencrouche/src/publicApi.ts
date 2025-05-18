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
import { $, $$, $$$, addCss, h, n81i, apocalypse } from "./utils/tools";
import {
	getStickyPluginTypes,
	getStickyPluginModel,
	registerSticky,
	workspace,
} from "./sticky/sticky";
import { registerContextMenu } from "./contextMenu";
import { dataset } from "./dataWizard";
import { createDock } from "./dock/dock";
import { trayTip } from "./utils/trayTip";

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
	trayTip,
	workspace,
	createDock,
	apocalypse,
	registerSticky,
	executeCommand,
	registerCommand,
	getStickyPluginModel,
	registerContextMenu,
	getStickyPluginTypes,
};

export function addPublicApi() {
	window.mc = mc;
}
