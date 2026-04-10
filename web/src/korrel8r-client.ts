import {
  getDomains,
  Goals,
  Neighbours,
  postGraphsGoals,
  postGraphsNeighbours,
} from './korrel8r/client';
import { createClient } from './korrel8r/client/client';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';

const KORREL8R_ENDPOINT =
  '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r/api/v1alpha1';

export const listDomains = () => {
  const korrel8rClient = createClient({
    baseUrl: KORREL8R_ENDPOINT,
    fetch: consoleFetch,
  });

  return getDomains({ client: korrel8rClient });
};

export const getNeighborsGraph = (neighbours: Neighbours) => {
  const korrel8rClient = createClient({
    headers: {
      Accept: 'application/json',
    },
    baseUrl: KORREL8R_ENDPOINT,
    fetch: consoleFetch,
  });

  return postGraphsNeighbours({ client: korrel8rClient, body: neighbours });
};

export const getGoalsGraph = (goals: Goals) => {
  const korrel8rClient = createClient({
    headers: {
      Accept: 'application/json',
    },
    baseUrl: KORREL8R_ENDPOINT,
    fetch: consoleFetch,
  });

  return postGraphsGoals({ client: korrel8rClient, body: goals });
};
