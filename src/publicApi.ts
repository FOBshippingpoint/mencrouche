import { registerCommand, executeCommand, } from "./commands";
import { $, $$, $$$ } from "./utils/dollars";
import {
  getCustomStickyTypes,
  getCustomStickyComposer,
  registerSticky,
  stickyManager,
} from "./sticky";
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
  stickyManager,
  registerSticky,
  executeCommand,
  registerCommand,
  registerContextMenu,
  getCustomStickyTypes,
  getCustomStickyComposer,
};

export function addPublicApi() {
  window.mc = mc;
}
