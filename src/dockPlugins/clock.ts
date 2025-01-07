import { createDock } from "../dock/dock";
import { getTemplateWidgets } from "../utils/getTemplateWidgets";

// TODO: sync with user locale
export function initClockDock() {
  const clockDock = (getTemplateWidgets("clockWidgets") as HTMLElement)
    .firstElementChild!;
  const timeEl = clockDock.$(".time")!;
  const dateEl = clockDock.$(".date")!;

  function updateTime() {
    const now = new Date();

    timeEl.textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  updateTime();
  setInterval(() => updateTime(), 1000);

  createDock({
    name: "clock",
    placement: "bottomRight",
    body: clockDock,
    edgePadding: "var(--size-2)",
    grow: false,
  });
}
