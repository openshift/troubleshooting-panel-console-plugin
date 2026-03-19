import { action, ActionType as Action } from 'typesafe-actions';
import { Graph } from './korrel8r/types';
import { Duration, HOUR, Period } from './time';

export enum ActionType {
  CloseTroubleshootingPanel = 'closeTroubleshootingPanel',
  OpenTroubleshootingPanel = 'openTroubleshootingPanel',
  SetSearch = 'setSearch',
  SetResult = 'setResult',
}

export enum SearchType {
  Depth = 'depth',
  Goal = 'goal',
}

// Search parameters from panel widgets for korrel8r request.
export type Search = {
  queryStr: string;
  searchType: SearchType;
  depth?: number;
  goal?: string;
  period?: Period;
};

// Result displayed in troubleshooting panel, graph or message.
export type Result = {
  graph?: Graph; // Successful result
  // True means the call failed and can/should be re-tried.
  // False means the call should not be re-tried, it is impossible or succeeded with empty results.
  isError?: boolean;
  title?: string; // Title when there is no graph.
  message?: string; // Message when there is no graph.
};

// Default search parameters do a neighbourhood search of depth 3.
export const defaultSearch: Search = {
  queryStr: '',
  searchType: SearchType.Depth,
  depth: 3,
  period: new Duration(1, HOUR),
};

export const closeTP = () => action(ActionType.CloseTroubleshootingPanel);
export const openTP = () => action(ActionType.OpenTroubleshootingPanel);
export const setSearch = (search: Search) => action(ActionType.SetSearch, search);
export const setResult = (result: Result | null) => action(ActionType.SetResult, result);

export const actions = {
  closeTP,
  openTP,
  setSearch,
  setResult,
};

export type TPAction = Action<typeof actions>;
