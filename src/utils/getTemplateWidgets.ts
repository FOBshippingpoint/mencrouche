import { $ } from "./dollars";

export function getTemplateWidgets(widgetTemplateId: string) {
  return $<HTMLElement>(
    $<HTMLTemplateElement>(`#${widgetTemplateId}`)!.content.cloneNode(
      true,
    ) as any,
  )!;
}
