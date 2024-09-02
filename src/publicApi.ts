import { registerCommand, executeCommand, } from "./commands";
import { $, $$, $$$ } from "./utils/dollars";
import {
  getCustomStickyTypes,
  getCustomStickyComposer,
  registerSticky,
} from "./sticky";
import { n81i } from "./utils/n81i";
import { dataset } from "./myDataset";
import { registerContextMenu } from "./contextMenu";
import { apocalypse } from "./apocalypse";

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
