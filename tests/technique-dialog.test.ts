import test from "node:test";
import assert from "node:assert/strict";
import { openTechniqueDialog, handleTechniqueDialogKey } from "../src/components/technique-dialog-behaviour.ts";

function fixture() {
  const page = { activeElement: null as unknown, body: { style: { overflow: "auto", paddingRight: "4px" } }, documentElement: { clientWidth: 1425 }, defaultView: { innerWidth: 1440, getComputedStyle: () => ({ paddingRight: "4px" }) } };
  const closeButton = { focus: () => { page.activeElement = closeButton; } };
  const askLink = { focus: () => { page.activeElement = askLink; } };
  const trigger = { isConnected: true, focus: () => { page.activeElement = trigger; } };
  const dialog = { open: false, ownerDocument: page, showModal() { this.open = true; }, close() { this.open = false; }, querySelector: (selector: string) => selector === "button" ? closeButton : askLink };
  return { page, closeButton, askLink, trigger, dialog, element: dialog as unknown as HTMLDialogElement };
}
test("opening a technique dialog focuses its close button and closing restores exact trigger and page styles", () => {
  const f = fixture();
  const restore = openTechniqueDialog(f.element, f.trigger as unknown as HTMLButtonElement);
  assert.equal(f.dialog.open, true);
  assert.equal(f.page.activeElement, f.closeButton);
  assert.equal(f.page.body.style.overflow, "hidden");
  assert.equal(f.page.body.style.paddingRight, "19px");
  restore();
  assert.equal(f.dialog.open, false);
  assert.equal(f.page.activeElement, f.trigger);
  assert.deepEqual(f.page.body.style, { overflow: "auto", paddingRight: "4px" });
});
test("Tab and Shift+Tab wrap within the dialog; Escape dismisses and restores focus", () => {
  const f = fixture();
  const restore = openTechniqueDialog(f.element, f.trigger as unknown as HTMLButtonElement);
  let prevented = false;
  const event = { key: "Tab", shiftKey: true, currentTarget: f.element, preventDefault: () => { prevented = true; } };
  handleTechniqueDialogKey(event, restore);
  assert.equal(f.page.activeElement, f.askLink); assert.equal(prevented, true);
  handleTechniqueDialogKey({ ...event, shiftKey: false }, restore);
  assert.equal(f.page.activeElement, f.closeButton);
  handleTechniqueDialogKey({ ...event, key: "Escape" }, restore);
  assert.equal(f.dialog.open, false); assert.equal(f.page.activeElement, f.trigger);
  assert.equal(f.page.body.style.overflow, "auto");
});
test("navigation cleanup unlocks the document without focusing a detached trigger", () => {
  const f = fixture();
  const restore = openTechniqueDialog(f.element, f.trigger as unknown as HTMLButtonElement);
  f.trigger.isConnected = false;
  restore();
  assert.notEqual(f.page.activeElement, f.trigger);
  assert.equal(f.page.body.style.overflow, "auto");
});
