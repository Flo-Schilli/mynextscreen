import { Injectable } from '@nestjs/common';
import type { ContentSourceAdapter, ParamField } from './adapters/content-source-adapter.interface';
import { ConcertbueroFrankenAdapter } from './adapters/concertbuero-franken.adapter';

/** Public description of an adapter for the dashboard. */
export interface AdapterDescriptor {
  type: string;
  label: string;
  paramsSchema: readonly ParamField[];
}

export class UnknownAdapterError extends Error {
  constructor(type: string) {
    super(`Unknown content source adapter "${type}"`);
    this.name = 'UnknownAdapterError';
  }
}

/** Maps an adapter type to its implementation. New websites register here. */
@Injectable()
export class ContentSourceAdapterRegistry {
  private readonly adapters: ReadonlyMap<string, ContentSourceAdapter>;

  constructor(concertbueroFranken: ConcertbueroFrankenAdapter) {
    const all: ContentSourceAdapter[] = [concertbueroFranken];
    this.adapters = new Map(all.map((adapter) => [adapter.type, adapter]));
  }

  has(type: string): boolean {
    return this.adapters.has(type);
  }

  /** Throws {@link UnknownAdapterError} for an unregistered type. */
  get(type: string): ContentSourceAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new UnknownAdapterError(type);
    }
    return adapter;
  }

  describe(): AdapterDescriptor[] {
    return [...this.adapters.values()].map(({ type, label, paramsSchema }) => ({
      type,
      label,
      paramsSchema,
    }));
  }
}
