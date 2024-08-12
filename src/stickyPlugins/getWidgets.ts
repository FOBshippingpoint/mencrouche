import { $ } from "../utils/dollars";
import { getCustomStickyTypes, Sticky } from "../sticky";

export function getWidgets(sticky: Sticky, widgetTemplateName: string) {
  for (const type of getCustomStickyTypes()) {
    if (sticky.classList.contains(type)) {
      return sticky;
    }
  }

  return getTemplateWidgets(widgetTemplateName)!;
}

export function getTemplateWidgets(widgetTemplateName: string) {
  return $<HTMLElement>(
    $<HTMLTemplateElement>(`#${widgetTemplateName}`)!.content.cloneNode(
      true,
    ) as any,
  )!;
}
