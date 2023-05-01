import {
    BaseFactExtractorSchema,
    CacheSchema,
    FilterSchema,
    FrequencySchema,
  } from '@spotify/backstage-plugin-soundcheck-common';
  import { z } from 'zod';
  
  export function buildFactCollectorSchema(ExtractorsChoice: z.ZodUnion<any>) {
    const SingleFactCollectorSchema = z.object({
      frequency: FrequencySchema.optional(),
      filter: FilterSchema.optional(),
      cache: CacheSchema.optional(),
      collects: ExtractorsChoice.optional(),
    });
    return z.array(SingleFactCollectorSchema).or(SingleFactCollectorSchema);
  }
  
  const BranchCountFactExtractorSchema =
    BaseFactExtractorSchema.and(
      z.object({
        type: z.string().regex(new RegExp(`branchDescriptor`)),
      }),
    );
  
  const ExtractorsChoice = BranchCountFactExtractorSchema.or(
    BranchCountFactExtractorSchema,
  );
  
  export const BranchCountFactCollectorSchema =
    buildFactCollectorSchema(ExtractorsChoice);