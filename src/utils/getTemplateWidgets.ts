import { $ } from "./dollars";

export function getTemplateWidgets(widgetTemplateId: string) {
  return $<HTMLTemplateElement>(`#${widgetTemplateId}`)!.content.cloneNode(
    true,
  );
}
