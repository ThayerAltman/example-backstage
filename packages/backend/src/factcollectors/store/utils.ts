import {
  BaseFactExtractorSchema,
  CacheSchema,
  FilterSchema,
  FrequencySchema,
} from "@spotify/backstage-plugin-soundcheck-common";
import { z } from "zod";

/**
 * Builds a schema for a fact collector.
 * @param {z.ZodUnion<any>} ExtractorsChoice - The choice of extractor.
 * @returns {z.ZodUnion<any>} - A schema for a fact collector.
 */
export function buildFactCollectorSchema(ExtractorsChoice: z.ZodUnion<any>) {
  const SingleFactCollectorSchema = z.object({
    // Optional frequency schema
    frequency: FrequencySchema.optional(),
    // Optional filter schema
    filter: FilterSchema.optional(),
    // Optional cache schema
    cache: CacheSchema.optional(),
    // Optional collectors schema
    collects: ExtractorsChoice.optional(),
  });
  // Return either an array of SingleFactCollectorSchema or a single SingleFactCollectorSchema
  return z.array(SingleFactCollectorSchema).or(SingleFactCollectorSchema);
}

// Schema for the BranchesDetailsFactExtractor. It extends the BaseFactExtractorSchema and adds a type field.
const BranchesDetailsFactExtractorSchema = BaseFactExtractorSchema.and(
  z.object({
    // The type should be a string and matches the regular expression `branchDescriptor`
    type: z.string().regex(new RegExp(`branchDescriptor`)),
  })
);

// Define the extractor choices. Currently, only BranchesDetailsFactExtractorSchema is available.
const ExtractorsChoice = BranchesDetailsFactExtractorSchema.or(
  BranchesDetailsFactExtractorSchema
);

/**
 * Defines the BranchesDetailsFactCollectorSchema by building a fact collector schema with the given extractor choices.
 */
export const BranchesDetailsFactCollectorSchema =
  buildFactCollectorSchema(ExtractorsChoice);
