/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Query run during a correlation with a count of results found.
 */
export type QueryCount = {
  /**
   * Count of results or -1 if the query was not executed.
   */
  count?: number;
  /**
   * Query for correlation data.
   */
  query?: string;
};

