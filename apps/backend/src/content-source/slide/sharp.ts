/**
 * sharp ships separate typings for `require` (`export =`) and `import`
 * (`export default`). tsc resolves the former, ts-jest the latter, so a plain
 * import type-checks in only one of them. This shim normalises the type and
 * loads the CommonJS build, which is what runs in both.
 */
type SharpModule = typeof import('sharp');
export type SharpFactory = SharpModule extends { default: infer Factory } ? Factory : SharpModule;
export type SharpOverlay = Parameters<ReturnType<SharpFactory>['composite']>[0] extends
  (infer Overlay)[] | undefined
  ? Overlay
  : never;

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const sharp: SharpFactory = require('sharp');
