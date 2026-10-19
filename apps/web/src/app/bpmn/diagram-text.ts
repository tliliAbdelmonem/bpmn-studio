/**
 * bpmn-js draws labels as SVG text and measures them in JS, so CSS can't change their font.
 * Pass this as the `textRenderer` option so labels use the app font inherited by `host`.
 */
export function textRendererConfig(host: HTMLElement): {
  defaultStyle: { fontFamily: string };
} {
  return { defaultStyle: { fontFamily: getComputedStyle(host).fontFamily } };
}
