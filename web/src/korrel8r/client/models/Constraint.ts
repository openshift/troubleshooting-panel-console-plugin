/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Constraint constrains the objects that will be included in search results.
 */
export type Constraint = {
  /**
   * End of time interval, quoted RFC 3339 format.
   */
  end?: string | null;
  /**
   * Limit number of objects returned per query, <=0 means no limit.
   */
  limit?: number;
  /**
   * Start of time interval, quoted RFC 3339 format.
   */
  start?: string | null;
  /**
   * Timeout per request, h/m/s/ms/ns format
   */
  timeout?: string;
};

