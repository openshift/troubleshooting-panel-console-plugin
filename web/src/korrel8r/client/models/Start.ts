/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Constraint } from './Constraint';
/**
 * Start identifies a set of starting objects for correlation.
 */
export type Start = {
  /**
   * Class for `objects`
   */
  class?: string;
  constraint?: Constraint;
  /**
   * Objects of `class` serialized as JSON
   */
  objects?: any;
  /**
   * Queries for starting objects
   */
  queries?: Array<string>;
};

