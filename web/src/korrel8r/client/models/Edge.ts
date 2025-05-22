/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Rule } from './Rule';
/**
 * Directed edge in the result graph, from Start to Goal classes.
 */
export type Edge = {
  /**
   * Goal is the class name of the goal node.
   */
  goal?: string;
  /**
   * Rules is the set of rules followed along this edge.
   */
  rules?: Array<Rule>;
  /**
   * Start is the class name of the start node.
   */
  start?: string;
};

