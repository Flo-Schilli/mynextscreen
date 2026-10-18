import type {
  NdiBinding,
  NdiFinder,
  NdiRawFrame,
  NdiRawReceiver,
  NdiSourceInfo,
} from './ndi-receiver';

/**
 * The slice of the `grandi` module this agent touches. Declared here instead
 * of imported: the package is ESM-only with a native addon, and neither the
 * build nor the specs may load it.
 */
interface GrandiModule {
  isSupportedCPU(): boolean;
  initialize(): boolean;
  find(options: { extraIPs?: string; showLocalSources?: boolean }): Promise<{
    wait(timeoutMs: number): Promise<unknown>;
    sources(): Array<{ name: string }>;
    destroy(): void;
  }>;
  receive(options: {
    source: { name: string };
    colorFormat: number;
    bandwidth: number;
    allowVideoFields: boolean;
  }): Promise<{
    video(timeoutMs: number): Promise<{
      data: Buffer;
      xres: number;
      yres: number;
      lineStrideBytes: number;
      frameRateN: number;
      frameRateD: number;
      fourCC: number;
    }>;
    destroy(): void;
  }>;
  ColorFormat: { UYVY_BGRA: number };
  Bandwidth: { Lowest: number; Highest: number };
  FourCC: { UYVY: number };
}

// A real dynamic import: TypeScript's CommonJS output would turn `import()` into
// `require()`, which cannot load an ES module.
const nativeImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<{ default: GrandiModule }>;

/** Loads grandi on first use, so hosts without NDI support never touch the addon. */
export function createGrandiBinding(): NdiBinding {
  let loading: Promise<GrandiModule> | null = null;

  const load = (): Promise<GrandiModule> => {
    loading ??= nativeImport('grandi').then(({ default: grandi }) => {
      if (!grandi.isSupportedCPU()) {
        throw new Error('NDI is not supported on this CPU');
      }
      grandi.initialize();
      return grandi;
    });
    return loading;
  };

  return {
    async find(extraIp: string): Promise<NdiFinder> {
      const grandi = await load();
      const finder = await grandi.find({ extraIPs: extraIp });
      return {
        wait: async (timeoutMs) => {
          await finder.wait(timeoutMs);
        },
        // Handed through untouched: `receive` needs the address fields the SDK
        // attached to each source, not just the name.
        sources: (): NdiSourceInfo[] => finder.sources(),
        destroy: () => finder.destroy(),
      };
    },

    async receive(source, bandwidth): Promise<NdiRawReceiver> {
      const grandi = await load();
      const receiver = await grandi.receive({
        source,
        colorFormat: grandi.ColorFormat.UYVY_BGRA,
        bandwidth: bandwidth === 'lowest' ? grandi.Bandwidth.Lowest : grandi.Bandwidth.Highest,
        allowVideoFields: false,
      });
      return {
        video: async (timeoutMs): Promise<NdiRawFrame> => {
          const frame = await receiver.video(timeoutMs);
          return { ...frame, isUyvy: frame.fourCC === grandi.FourCC.UYVY };
        },
        destroy: () => receiver.destroy(),
      };
    },
  };
}
