import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { env } from '../../config/env.js';
import type {
  AspAdapter,
} from '../contracts/asp-adapter.interface.js';
import { MockAspAdapter } from '../adapters/mock-asp.adapter.js';
import { RemoteAspAdapter } from '../adapters/remote-asp.adapter.js';

@Injectable()
export class AspAdapterRegistry {
  private readonly adapters =
    new Map<string, AspAdapter>();

  constructor(
    @Inject(MockAspAdapter)
    mockAspAdapter: MockAspAdapter,
    @Inject(RemoteAspAdapter)
    remoteAspAdapter: RemoteAspAdapter,
  ) {
    this.register(mockAspAdapter);

    if (
      remoteAspAdapter.providerName !==
      mockAspAdapter.providerName
    ) {
      this.register(remoteAspAdapter);
    }
  }

  register(adapter: AspAdapter): void {
    const providerName =
      adapter.providerName?.trim();

    if (!providerName) {
      throw new Error(
        'ASP adapter providerName is required.',
      );
    }

    if (this.adapters.has(providerName)) {
      throw new Error(
        `Duplicate ASP adapter registered for provider: ${providerName}`,
      );
    }

    this.adapters.set(
      providerName,
      adapter,
    );
  }

  get(providerName: string): AspAdapter {
    const adapter =
      this.adapters.get(providerName);

    if (!adapter) {
      throw new Error(
        `No ASP adapter registered for provider: ${providerName}`,
      );
    }

    return adapter;
  }

  getConfigured(): AspAdapter {
    return this.get(env.aspProvider);
  }

  has(providerName: string): boolean {
    return this.adapters.has(providerName);
  }

  listProviders(): string[] {
    return Array.from(
      this.adapters.keys(),
    );
  }
}
