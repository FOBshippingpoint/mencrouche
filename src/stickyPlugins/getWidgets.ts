import { $ } from "../utils/dollars";
import { getCustomStickyTypes, Sticky } from "../sticky";

export function getWidgets(sticky: Sticky, widgetTemplateId: string) {
  for (const type of getCustomStickyTypes()) {
    if (sticky.classList.contains(type)) {
      return sticky;
    }
  }

  return getTemplateWidgets(widgetTemplateId)!;
}

export function getTemplateWidgets(widgetTemplateId: string) {
  return $<HTMLElement>(
    $<HTMLTemplateElement>(`#${widgetTemplateId}`)!.content.cloneNode(
      true,
    ) as any,
  )!;
}
