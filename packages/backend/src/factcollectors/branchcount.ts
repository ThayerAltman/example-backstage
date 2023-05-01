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
  isScmEntity
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
import { graphql, GraphQlQueryResponseData } from '@octokit/graphql'

export class BranchCountFactCollector implements FactCollector {
  public static ID = 'branchcount';
  readonly #logger: Logger;
  readonly #BranchCountExtractorsStore: BranchCountExtractorsStore;
  readonly #credentialsProvider: GithubCredentialsProvider;
  readonly #integrations: ScmIntegrations;
  public static create(config: Config, logger: Logger): BranchCountFactCollector {
    return new BranchCountFactCollector(config, logger);
  }

  /** {@inheritDoc @spotify/backstage-plugin-soundcheck-node#FactCollector.id} */
  id = BranchCountFactCollector.ID;

  private constructor(config: Config, logger: Logger) {
    this.#logger = logger.child({
      target: this.id,
    });
    this.#BranchCountExtractorsStore = BranchCountExtractorsStore.create(
      this.#logger,
      config,
    );
    this.#integrations = ScmIntegrations.fromConfig(config);
    this.#credentialsProvider =
      DefaultGithubCredentialsProvider.fromIntegrations(this.#integrations);
  }

  buildFact(entityRef: string, factRef: FactRef, factData: JsonObject): Fact {
    return {
      factRef: factRef,
      entityRef: entityRef,
      data: factData,
      timestamp: DateTime.now().toUTC().toISO(),
    };
  }

  buildCollectionConfigs(
    source: string,
    extractorConfigs: ExtractorConfig[],
  ): CollectionConfig[] {
    return extractorConfigs.map(extractorConfig => {
      return {
        factRefs: [getFactRef(source, extractorConfig)],
        filter: extractorConfig.filter,
        frequency: extractorConfig.frequency,
        cache: extractorConfig.cache,
      };
    });
  }

  async collect(
    entities: Entity[],
    _params?: { factRefs?: FactRef[]; refresh?: FactRef[] },
  ): Promise<Fact[]> {
    try {
      const factRef: FactRef = stringifyFactRef({
        name: 'branch_count',
        scope: 'default',
        source: 'branch',
      });
      return Promise.all(
        entities
          .filter(entity => isScmEntity(entity))
          .map(async entity => {
            const entityRef = stringifyEntityRef(entity);
            const entityScmUrl = getEntityScmUrl(entity);
            const gitUrl = parseGitUrl(entityScmUrl);

            const { token } = await this.#credentialsProvider.getCredentials({ url: entityScmUrl });
            const response = await graphql(
              `
              query numBranches($owner: String!, $repo: String!) {
                repository(owner: $owner, name: $repo) {
                  refs(first: 0, refPrefix: "refs/heads/") {
                    totalCount
                  }
                }
              }
            `,
              {
                owner: gitUrl.owner,
                repo: gitUrl.name,
                headers: {
                  authorization: 'Bearer ' + token,
                },
              }
            ) as GraphQlQueryResponseData;
            
            console.log("BranchCountFactCollector: " + gitUrl.owner + ": " + gitUrl.name + ": " + "Total Count: "
            + response["repository"]["refs"]["totalCount"]);

            return this.buildFact(entityRef, factRef, response["repository"]["refs"]);
          }),
      );
    } catch (e) {
      this.#logger.error(`Failed to collect branch data with error: ${e}`);
      return Promise.reject([]);
    }
  }

  getCollectionConfigs(): Promise<CollectionConfig[]> {
    return Promise.resolve(
      this.buildCollectionConfigs(
        this.id,
        this.#BranchCountExtractorsStore.getExtractorConfigs(),
      ),
    );
  }

  getDataSchema(_factRef: FactRef): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  getFactNames(): Promise<string[]> {
    return Promise.resolve(
      this.#BranchCountExtractorsStore.getExtractorConfigs().map(c => c.factName),
    );
  }
}