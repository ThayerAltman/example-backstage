import { ExtractorsStore } from '@spotify/backstage-plugin-soundcheck-node';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import {
  buildExtractorConfigMap,
  ExtractorConfig,
} from '@spotify/backstage-plugin-soundcheck-common';
import { BranchCountFactCollectorSchema } from './utils';

export class BranchCountExtractorsStore implements ExtractorsStore {
  static create(logger: Logger, config: Config): BranchCountExtractorsStore {
    return new BranchCountExtractorsStore(logger, config);
  }

  #extractorConfigs: Record<string, ExtractorConfig>;
  readonly #logger: Logger;

  private constructor(logger: Logger, config: Config) {
    this.#logger = logger;
    this.#extractorConfigs = this.#parseExtractorSchemaTypesFromConfig(config);

    // Config#subscribe will be called when configuration is
    // updated by modifying yaml files during local development,
    // so we can call it here to shorten the feedback loop when
    // working on extractorConfigs locally.
    config.subscribe?.(() => {
      this.#extractorConfigs =
        this.#parseExtractorSchemaTypesFromConfig(config);
    });
  }

  #parseExtractorSchemaTypesFromConfig(
    config: Config,
  ): Record<string, ExtractorConfig> {
    const collectors = config.getOptional('soundcheck.collectors.branch');

    // branch collection not configured, so nothing to do.
    if (!collectors) return {};

    // Zod verification.
    const schema = BranchCountFactCollectorSchema.safeParse(collectors);
    if (!schema.success) {
      this.#logger.error(`Failed to parse BranchCountFactCollector from schema.`);
      throw new Error(schema.error.message);
    }

    return buildExtractorConfigMap(schema.data);
  }

  getExtractorConfig(factName: string): ExtractorConfig {
    return this.#extractorConfigs[factName];
  }

  getExtractorConfigs(): ExtractorConfig[] {
    return Object.values(this.#extractorConfigs);
  }
}