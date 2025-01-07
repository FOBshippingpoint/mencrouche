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
import { $, $$, $$$, h } from "./utils/dollars";
import {
  getCustomStickyTypes,
  getCustomSticky,
  registerSticky,
  stickyWorkspace,
} from "./sticky/sticky";
import { n81i } from "./utils/n81i";
import { registerContextMenu } from "./contextMenu";
import { apocalypse } from "./apocalypse";
import { dataset } from "./dataWizard";
import { createDock } from "./dock/dock";

declare global {
  interface Window {
    mc: typeof mc;
  }
}

const mc = {
  h,
  $,
  $$,
  $$$,
  n81i,
  dataset,
  createDock,
  apocalypse,
  stickyWorkspace,
  registerSticky,
  executeCommand,
  registerCommand,
  getCustomSticky,
  registerContextMenu,
  getCustomStickyTypes,
};

export function addPublicApi() {
  window.mc = mc;
}
