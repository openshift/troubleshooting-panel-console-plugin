import { cancellableFetch } from './cancellable-fetch';
import { Korrel8rGraphResponse, Korrel8rResponse } from './korrel8r/query.types';

const KORREL8R_ENDPOINT = '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r';

export const listDomains = () => {
  const requestData = { method: 'GET' };

  return cancellableFetch<Korrel8rResponse>(
    `${KORREL8R_ENDPOINT}/api/v1alpha1/domains`,
    requestData,
  );
};

export const getNeighborsGraph = ({ query }: { query?: string }, depth: number) => {
  query = query.trim();
  const requestData = {
    method: 'POST',
    body: JSON.stringify({
      start: {
        queries: query ? [query] : [],
      },
      depth: depth,
    }),
  };

  return cancellableFetch<Korrel8rGraphResponse>(
    `${KORREL8R_ENDPOINT}/api/v1alpha1/graphs/neighbours`,
    requestData,
  );
};

export const getGoalsGraph = ({ query }: { query?: string }, goal: string) => {
  query = query.trim();
  const requestData = {
    method: 'POST',
    body: JSON.stringify({
      start: {
        queries: query ? [query] : [],
      },
      goals: [goal],
    }),
  };

  return cancellableFetch<Korrel8rGraphResponse>(
    `${KORREL8R_ENDPOINT}/api/v1alpha1/graphs/goals`,
    requestData,
  );
};
