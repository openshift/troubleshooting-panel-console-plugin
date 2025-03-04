/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Domain } from '../models/Domain';
import type { Goals } from '../models/Goals';
import type { Graph } from '../models/Graph';
import type { Neighbours } from '../models/Neighbours';
import type { Node } from '../models/Node';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Change key configuration settings at runtime.
     * @param verbose verbose setting for logging
     * @returns any OK
     * @throws ApiError
     */
    public static putConfig(
        verbose?: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/config',
            query: {
                'verbose': verbose,
            },
        });
    }
    /**
     * Get name, configuration and status for each domain.
     * @returns Domain OK
     * @returns any
     * @throws ApiError
     */
    public static getDomains(): CancelablePromise<Array<Domain> | any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/domains',
        });
    }
    /**
     * Create a correlation graph from start objects to goal queries.
     * @param request search from start to goal classes
     * @param rules include rules in graph edges
     * @returns Graph OK
     * @returns any
     * @throws ApiError
     */
    public static postGraphsGoals(
        request: Goals,
        rules?: boolean,
    ): CancelablePromise<Graph | any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/graphs/goals',
            query: {
                'rules': rules,
            },
            body: request,
        });
    }
    /**
     * Create a neighbourhood graph around a start object to a given depth.
     * @param request search from neighbours
     * @param rules include rules in graph edges
     * @returns Graph OK
     * @returns any
     * @throws ApiError
     */
    public static postGraphsNeighbours(
        request: Neighbours,
        rules?: boolean,
    ): CancelablePromise<Graph | any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/graphs/neighbours',
            query: {
                'rules': rules,
            },
            body: request,
        });
    }
    /**
     * Create a list of goal nodes related to a starting point.
     * @param request search from start to goal classes
     * @returns Node OK
     * @returns any
     * @throws ApiError
     */
    public static postListsGoals(
        request: Goals,
    ): CancelablePromise<Array<Node> | any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/lists/goals',
            body: request,
        });
    }
    /**
     * Execute a query, returns a list of JSON objects.
     * @param query query string
     * @returns any OK
     * @throws ApiError
     */
    public static getObjects(
        query: string,
    ): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/objects',
            query: {
                'query': query,
            },
        });
    }
}
