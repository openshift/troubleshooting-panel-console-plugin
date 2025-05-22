/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QueryCount } from './QueryCount';
/**
 * Rule is a correlation rule with a list of queries and results counts found during navigation.
 */
export type Rule = {
  /**
   * Name is an optional descriptive name.
   */
  name?: string;
  /**
   * Queries generated while following this rule.
   */
  queries?: Array<QueryCount>;
};

