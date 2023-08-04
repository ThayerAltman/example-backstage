import { FactCollector } from '@spotify/backstage-plugin-soundcheck-node';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import {
  CollectionConfig,
  ExtractorConfig,
  Fact,
  FactRef,
  getFactRef,
  stringifyFactRef,
  getEntityScmUrl,
  isScmEntity,
} from '@spotify/backstage-plugin-soundcheck-common';
import { Logger } from 'winston';
import { Config, JsonObject } from '@backstage/config';
import { DateTime } from 'luxon';
import { BranchCountExtractorsStore } from './store/BranchCountExtractorsStore';
import parseGitUrl from 'git-url-parse';
import {
  DefaultGithubCredentialsProvider,
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { graphql, GraphQlQueryResponseData } from '@octokit/graphql';

export class BranchCountFactCollector implements FactCollector {
  public static ID = 'branch';

  // Private fields
  readonly #logger: Logger;
  readonly #BranchCountExtractorsStore: BranchCountExtractorsStore;
  readonly #credentialsProvider: GithubCredentialsProvider;

  /**
   * Factory method for creating instances of ADOFactCollector
   * @param {Config} config - Configuration object
   * @param {Logger} logger - Logger object
   * @return {ADOFactCollector} An instance of ADOFactCollector
   */
  public static create(
    config: Config,
    logger: Logger
  ): BranchCountFactCollector {
    return new BranchCountFactCollector(config, logger);
  }

  /** {@inheritDoc @spotify/backstage-plugin-soundcheck-node#FactCollector.id} */
  id = BranchCountFactCollector.ID;

  /**
   * @constructor
   * @description The constructor is private, use the static create() method to create instances
   * @param {Config} config Configuration object
   * @param {Logger} logger Logger object
   */
  private constructor(config: Config, logger: Logger) {
    this.#logger = logger.child({
      target: this.id,
    });
    this.#BranchCountExtractorsStore = BranchCountExtractorsStore.create(
      this.#logger,
      config
    );
    this.#credentialsProvider =
      DefaultGithubCredentialsProvider.fromIntegrations(
        ScmIntegrations.fromConfig(config)
      );
  }

  /**
   * Builds a fact object from the given parameters.
   * @param {string} entityRef - The entity reference.
   * @param {FactRef} factRef - The fact reference.
   * @param {JsonObject} factData - The fact data.
   * @returns {Fact} The constructed fact object.
   */
  buildFact(entityRef: string, factRef: FactRef, factData: JsonObject) {
    return {
      factRef: factRef,
      entityRef: entityRef,
      data: factData,
      timestamp: DateTime.now().toUTC().toISO(),
    };
  }

  /**
   * Builds collection configurations from the given parameters.
   * @param {string} source - The source string.
   * @param {ExtractorConfig[]} extractorConfigs - Array of extractor configurations.
   * @returns {CollectionConfig[]} The constructed CollectionConfig array.
   */
  buildCollectionConfigs(
    source: string,
    extractorConfigs: ExtractorConfig[]
  ): CollectionConfig[] {
    return extractorConfigs.map((extractorConfig) => ({
      factRefs: [getFactRef(source, extractorConfig)],
      filter: extractorConfig.filter,
      frequency: extractorConfig.frequency,
      cache: extractorConfig.cache,
    }));
  }

  async collect(
    entities: Entity[],
    _params?: { factRefs?: FactRef[]; refresh?: FactRef[] }
  ) {
    try {
      const factRef: FactRef = stringifyFactRef({
        name: 'branch_count',
        scope: 'default',
        source: this.id,
      });
      const results = await Promise.all(
        entities
          .filter((entity) => isScmEntity(entity))
          .map((entity) => this.collectData(entity, factRef))
      );

      return results.filter((result): result is Fact => result !== null);
    } catch (e) {
      this.#logger.error(`Failed to collect branch data with error: ${e}`);
      return Promise.reject([]);
    }
  }

  async collectData(entity: Entity, factRef: string) {
    const entityRef = stringifyEntityRef(entity);
    const entityScmUrl = getEntityScmUrl(entity);
    const gitUrl = parseGitUrl(entityScmUrl);

    const { token } = await this.#credentialsProvider.getCredentials({
      url: entityScmUrl,
    });
    const {
      repository: { refs: totalCount },
    } = (
      await graphql<GraphQlQueryResponseData>(
        `
          query numBranches($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              refs(first: 0, refPrefix: 'refs/heads/') {
                totalCount
              }
            }
          }
        `,
        {
          owner: gitUrl.owner,
          repo: gitUrl.name,
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )
    ).catch((e) => {
      this.#logger.error(
        `BranchCountFactCollector: ${gitUrl.owner} ${gitUrl.name} - Failed to collect branch data with error: ${e}`
      );
      return null;
    });

    this.#logger.info(
      `BranchCountFactCollector: ${gitUrl.owner} ${gitUrl.name} - Total Count: ${totalCount} `
    );

    return this.buildFact(entityRef, factRef, totalCount);
  }

  /**
   * Gets the collection configurations
   * @returns {Promise<CollectionConfig[]>} - A Promise that resolves with an array of collection configurations
   */
  getCollectionConfigs() {
    return Promise.resolve(
      this.buildCollectionConfigs(
        this.id,
        this.#BranchCountExtractorsStore.getExtractorConfigs()
      )
    );
  }

  /**
   * Gets the data schema.
   * @param {_factRef: FactRef} factRef - The reference to the fact.
   * @returns {Promise<string | undefined>} A promise that resolves with the data schema or undefined.
   */
  getDataSchema(_factRef: FactRef) {
    return Promise.resolve(undefined);
  }

  /**
  /**
   * Gets the fact names.
   * @returns {Promise<string[]>} A promise that resolves with an array of fact names.
   */
  getFactNames() {
    return Promise.resolve(
      this.#BranchCountExtractorsStore
        .getExtractorConfigs()
        .map((c) => c.factName)
    );
  }
}
