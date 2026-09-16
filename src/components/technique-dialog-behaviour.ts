/** Native showModal supplies the top layer and inert background. */
export function openTechniqueDialog(element: HTMLDialogElement, trigger: HTMLButtonElement | null) {
  const page = element.ownerDocument;
  const view = page.defaultView!;
  const previousOverflow = page.body.style.overflow;
  const previousPadding = page.body.style.paddingRight;
  const scrollbarWidth = view.innerWidth - page.documentElement.clientWidth;
  page.body.style.paddingRight = `${parseFloat(view.getComputedStyle(page.body).paddingRight) + scrollbarWidth}px`;
  page.body.style.overflow = "hidden";
  element.showModal();
  element.querySelector<HTMLButtonElement>("button")?.focus();
  return () => {
    element.close();
    page.body.style.overflow = previousOverflow;
    page.body.style.paddingRight = previousPadding;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  };
}

export function handleTechniqueDialogKey(event: { key: string; shiftKey: boolean; currentTarget: HTMLDialogElement; preventDefault: () => void }, close: () => void) {
  if (event.key === "Escape") { event.preventDefault(); close(); return; }
  if (event.key !== "Tab") return;
  const first = event.currentTarget.querySelector<HTMLButtonElement>("button");
  const last = event.currentTarget.querySelector<HTMLAnchorElement>("a[href]");
  const active = event.currentTarget.ownerDocument.activeElement;
  if (event.shiftKey && active === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && active === last) { event.preventDefault(); first?.focus(); }
}
