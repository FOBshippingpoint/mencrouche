/**
 * publicApi.ts
 *
 * Exposing functions, classes for end-user/developer to use.
 * Simple usage:
 * ```javascript
 * window.mc.$(".selectSomeClass");
 * ```
 */
import { registerCommand, executeCommand, } from "./commands";
import { $, $$, $$$ } from "./utils/dollars";
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

declare global {
  interface Window {
    mc: typeof mc;
  }
}

const mc = {
  $,
  $$,
  $$$,
  n81i,
  dataset,
  apocalypse,
  stickyManager: stickyWorkspace,
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
