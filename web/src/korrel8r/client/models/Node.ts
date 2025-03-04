/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QueryCount } from './QueryCount';
/**
 * Node in the result graph, contains results for a single class.
 */
export type Node = {
    /**
     * Class is the full class name in "DOMAIN:CLASS" form.
     */
    class?: string;
    /**
     * Count of results found for this class, after de-duplication.
     */
    count?: number;
    /**
     * Queries yielding results for this class.
     */
    queries?: Array<QueryCount>;
};

