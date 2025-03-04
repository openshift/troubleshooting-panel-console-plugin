/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Store } from './Store';
/**
 * Domain configuration information.
 */
export type Domain = {
    /**
     * Name of the domain.
     */
    name?: string;
    /**
     * Stores configured for the domain.
     */
    stores?: Array<Store>;
};

