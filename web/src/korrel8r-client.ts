import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  getDomains,
  Goals,
  Graph,
  Neighbours,
  postGraphsGoals,
  postGraphsNeighbours,
  Start,
} from './korrel8r/client';
import { createClient } from './korrel8r/client/client';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import * as korrel8r from './korrel8r/types';

import { useTranslation } from 'react-i18next';
import { Search, SearchType } from './redux-actions';

const KORREL8R_ENDPOINT =
  '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r/api/v1alpha1';

// Result displayed in troubleshooting panel, graph or message.
export type GraphResult = {
  graph?: korrel8r.Graph; // Successful result
  title?: string; // Title when there is no graph.
  message?: string; // Message when there is no graph.
};

export const listDomains = () => {
  const korrel8rClient = createClient({
    baseUrl: KORREL8R_ENDPOINT,
    fetch: requestWrapper,
    throwOnError: true,
  });

  return getDomains({ client: korrel8rClient });
};

const getNeighborsGraph = (neighbours: Neighbours, signal: AbortSignal) => {
  const korrel8rClient = createClient({
    headers: {
      Accept: 'application/json',
    },
    baseUrl: KORREL8R_ENDPOINT,
    fetch: requestWrapper,
    signal,
    throwOnError: true,
  });

  return postGraphsNeighbours({ client: korrel8rClient, body: neighbours });
};

const getGoalsGraph = (goals: Goals, signal: AbortSignal) => {
  const korrel8rClient = createClient({
    headers: {
      Accept: 'application/json',
    },
    baseUrl: KORREL8R_ENDPOINT,
    fetch: requestWrapper,
    signal,
    throwOnError: true,
  });

  return postGraphsGoals({ client: korrel8rClient, body: goals });
};

export const useKorrel8rGraph = ({
  search,
  constraint,
}: {
  search: Search;
  constraint: korrel8r.Constraint;
}): UseQueryResult<GraphResult, Error> => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');

  const queryStr = search?.queryStr;
  const start: Start = {
    queries: [queryStr],
    constraint: constraint?.toAPI(),
  };

  return useQuery({
    queryKey: ['korrel8r', 'graph', search, constraint],
    queryFn: async ({ signal }) => {
      const fetch =
        search.searchType === SearchType.Goal
          ? getGoalsGraph({ start, goals: [search.goal] }, signal)
          : getNeighborsGraph({ start, depth: search.depth }, signal);
      return fetch.then(({ data }: { data: Graph }) => {
        return Array.isArray(data?.nodes) && data.nodes.length > 0
          ? { graph: new korrel8r.Graph(data) }
          : { title: t('Empty Result'), message: t('No correlated data found') };
      });
    },
    enabled: !!queryStr,
  });
};

const requestWrapper = async (req: Request) => {
  const url = new URL(req.url);
  // The Request object creates a rule with the full url, ie. https://console.openshift/korrel8r/path?q=a
  // However if the host is included in the url passed into consoleFetch then the
  // CSRF header will not be added, so we need to remove the host from the first parameter
  // which is done by adding the pathname and search together
  return consoleFetch(url.pathname + url.search, await initRequest(req));
};

/**
 * This function converts a Request to a RequestInit object
 *
 * Notably it converts a Header object into an object which can be passed in to initiate
 * a HeaderInit object, and clones the request body manually since the body field in
 * a Request object becomes locked
 */
const initRequest = async (req: Request): Promise<RequestInit> => {
  const init = {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    referrer: req.referrer,
    referrerPolicy: req.referrerPolicy,
    mode: req.mode,
    credentials: req.credentials,
    cache: req.cache,
    redirect: req.redirect,
    integrity: req.integrity,
    keepalive: req.keepalive,
    signal: req.signal,
  };
  const body = await req.clone().text();

  if (body) {
    init['body'] = body;
  }
  return init;
};
