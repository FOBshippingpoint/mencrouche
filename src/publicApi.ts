import { apocalypse, registerCommand, executeCommand } from "./commands";
import { $, $$, $$$ } from "./utils/dollars";
import {
  createSticky,
  getCustomStickyTypes,
  getRelatedCustomStickies,
  registerSticky,
} from "./sticky";
import { n81i } from "./utils/n81i";
import { dataset } from "./myDataset";

declare global {
  interface Window {
    mc: typeof mc;
  }
}

const mc = {
  apocalypse,
  registerSticky,
  createSticky,
  getRelatedCustomStickies,
  getCustomStickyTypes,
  registerCommand,
  executeCommand,
  dataset,
  n81i,
  $,
  $$,
  $$$,
};

export function addPublicApi() {
  window.mc = mc;
}
