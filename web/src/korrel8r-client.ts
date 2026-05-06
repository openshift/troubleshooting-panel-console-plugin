import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  listDomains as clientListDomains,
  Console,
  consoleEvents,
  Goals,
  Graph,
  graphGoals,
  graphNeighbors,
  Neighbors,
  setConsole,
  Start,
} from './korrel8r/client';
import { Config, createClient } from './korrel8r/client/client';
import * as korrel8r from './korrel8r/types';

import { useTranslation } from 'react-i18next';
import { Search, SearchType } from './redux-actions';
import { sleep } from './sleep';

// Result displayed in troubleshooting panel, graph or message.
export type GraphResult = {
  graph?: korrel8r.Graph; // Successful result
  title?: string; // Title when there is no graph.
  message?: string; // Message when there is no graph.
};

export const listDomains = (signal: AbortSignal) => {
  return clientListDomains({ client: korrel8rClient({ signal }) });
};

const getNeighborsGraph = (neighbours: Neighbors, signal: AbortSignal) => {
  return graphNeighbors({ client: korrel8rClient({ signal }), body: neighbours });
};

const getGoalsGraph = (goals: Goals, signal: AbortSignal) => {
  return graphGoals({ client: korrel8rClient({ signal }), body: goals });
};

export const sendConsoleUpdate = (body: Console, signal: AbortSignal) => {
  return setConsole({ client: korrel8rClient({ signal }), body });
};

export const getConsoleUpdates = (
  signal: AbortSignal,
  { minDelay, maxDelay }: { minDelay: number; maxDelay: number },
) => {
  // Cast: sseSleepFn is supported by the SSE runtime but not exposed in the generated Options type.
  return consoleEvents({
    client: korrel8rClient({ signal }),
    sseDefaultRetryDelay: minDelay,
    sseMaxRetryDelay: maxDelay,
    sseSleepFn: (ms: number) => sleep(ms, signal),
  } as Parameters<typeof consoleEvents>[0]);
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
    queryKey: ['korrel8r', 'graph', search, start],
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
    enabled: validRequest(search),
  });
};

const validRequest = (search: Search) => {
  if (!search?.queryStr) {
    return false;
  }
  if (search.searchType === SearchType.Goal) {
    return !!search.goal;
  }
  return !!search.depth;
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

const defaultConfig = {
  baseUrl: '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r/api/v1alpha1',
  headers: { Accept: 'application/json' },
  fetch: requestWrapper,
  throwOnError: true,
};

const korrel8rClient = (config: Config) => createClient({ ...defaultConfig, ...config });
