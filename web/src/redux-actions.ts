import { action, ActionType as Action } from 'typesafe-actions';

export enum ActionType {
  CloseTroubleshootingPanel = 'closeTroubleshootingPanel',
  OpenTroubleshootingPanel = 'openTroubleshootingPanel',
  SetPersistedQuery = 'setPersistedQuery',
}

export type Constraint = {
  start: null | string;
  end: null | string;
};
export enum QueryType {
  Neighbour,
  Goal,
}
export type Query = {
  query: string;
  queryType: QueryType;
  depth: null | number;
  goal: null | string;
  constraint: Constraint;
};

export const closeTP = () => action(ActionType.CloseTroubleshootingPanel);
export const openTP = () => action(ActionType.OpenTroubleshootingPanel);
export const setPersistedQuery = (query: Query) => action(ActionType.SetPersistedQuery, { query });

const actions = {
  closeTP,
  openTP,
  setPersistedQuery,
};

export type TPAction = Action<typeof actions>;
