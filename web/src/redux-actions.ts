import { action, ActionType as Action } from 'typesafe-actions';
import { Constraint } from './korrel8r/types';

export enum ActionType {
  CloseTroubleshootingPanel = 'closeTroubleshootingPanel',
  OpenTroubleshootingPanel = 'openTroubleshootingPanel',
  SetPersistedSearch = 'setPersistedSearch',
}

export enum SearchType {
  Neighbour,
  Goal,
}

// Search parameters from panel widgets for korrel8r request.
export type Search = {
  queryStr?: string;
  type?: SearchType;
  depth?: number;
  goal?: string;
  constraint?: Constraint;
};

// Default search parameters for new searches.
export const defaultSearch = {
  type: SearchType.Neighbour,
  depth: 3,
};

export const closeTP = () => action(ActionType.CloseTroubleshootingPanel);
export const openTP = () => action(ActionType.OpenTroubleshootingPanel);
export const setPersistedSearch = (query: Search) =>
  action(ActionType.SetPersistedSearch, { query });

const actions = {
  closeTP,
  openTP,
  setPersistedSearch,
};

export type TPAction = Action<typeof actions>;
