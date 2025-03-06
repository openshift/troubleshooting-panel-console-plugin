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
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DefaultService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Change key configuration settings at runtime.
     * @param verbose verbose setting for logging
     * @returns any OK
     * @throws ApiError
     */
    public putConfig(
        verbose?: number,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
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
    public getDomains(): CancelablePromise<Array<Domain> | any> {
        return this.httpRequest.request({
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
    public postGraphsGoals(
        request: Goals,
        rules?: boolean,
    ): CancelablePromise<Graph | any> {
        return this.httpRequest.request({
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
    public postGraphsNeighbours(
        request: Neighbours,
        rules?: boolean,
    ): CancelablePromise<Graph | any> {
        return this.httpRequest.request({
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
    public postListsGoals(
        request: Goals,
    ): CancelablePromise<Array<Node> | any> {
        return this.httpRequest.request({
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
    public getObjects(
        query: string,
    ): CancelablePromise<Array<any>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/objects',
            query: {
                'query': query,
            },
        });
    }
}
