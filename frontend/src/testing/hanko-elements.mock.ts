/**
 * Test double for `@teamhanko/hanko-elements`.
 *
 * The Angular `@angular/build:unit-test` builder bundles each spec file as an
 * esbuild entry point, so Vitest's `vi.mock` module-hoisting never runs and
 * mocking a bare module specifier at runtime is unsupported. ESM export
 * namespaces are also non-configurable, so `vi.spyOn(module, 'Hanko')` throws.
 *
 * Instead, `vitest.config.ts` aliases `@teamhanko/hanko-elements` to this file
 * for tests only (the alias is never applied to `ng build`). `AuthService`
 * constructs `new Hanko(...)`; this double delegates construction to a swappable
 * factory that specs install via `__setHankoFactory`, letting them capture and
 * configure the instance. `register` is a no-op so that `LoginComponent` and any
 * spec importing it work without a real Hanko runtime.
 */

export type HankoFactory = (apiUrl: string) => unknown;

const defaultFactory: HankoFactory = () => ({});

// State lives on globalThis so that the relative import used by specs and the
// aliased import used by app code share one factory even if the bundler creates
// two module records for this file.
const FACTORY_KEY = '__signageHankoFactory__';

interface HankoGlobal {
  [FACTORY_KEY]?: HankoFactory;
}

function getFactory(): HankoFactory {
  return (globalThis as HankoGlobal)[FACTORY_KEY] ?? defaultFactory;
}

export function __setHankoFactory(factory: HankoFactory): void {
  (globalThis as HankoGlobal)[FACTORY_KEY] = factory;
}

export function __resetHankoFactory(): void {
  (globalThis as HankoGlobal)[FACTORY_KEY] = defaultFactory;
}

export class Hanko {
  constructor(apiUrl: string) {
    return getFactory()(apiUrl) as Hanko;
  }
}

export function register(): Promise<void> {
  return Promise.resolve();
}
