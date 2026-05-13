import { useEffect, useRef } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { getConsoleUpdates, sendConsoleUpdate } from '../korrel8r-client';
import * as api from '../korrel8r/client';
import { Query } from '../korrel8r/types';
import {
  defaultSearch,
  openTP,
  Search,
  SearchType,
  setAgentError,
  setSearch,
} from '../redux-actions';
import { State } from '../redux-reducers';
import { sleep } from '../sleep';
import { useLocationQuery } from './useLocationQuery';
import { useNavigateToQuery } from './useNavigateToQuery';

const useAgentNavigation = ({
  minDelay = 3000,
  maxDelay = 30000,
}: { minDelay?: number; maxDelay?: number } = {}) => {
  const agentEnabled: boolean = useSelector((s: State) => s.plugins?.tp?.get('agentEnabled'));
  const view = useLocationQuery()?.toString();
  const search: Search = useSelector((s: State) => s.plugins?.tp?.get('search'), shallowEqual);
  const isOpen: boolean = useSelector((s: State) => s.plugins?.tp?.get('isOpen'));
  const dispatch = useDispatch();
  const navigateToQuery = useNavigateToQuery();

  const navigateToQueryRef = useRef(navigateToQuery);
  useEffect(() => {
    navigateToQueryRef.current = navigateToQuery;
  });

  // Handle console update events via an SSE request.
  useEffect(() => {
    if (!agentEnabled) {
      dispatch(setAgentError(''));
      return;
    }
    const controller = new AbortController();
    const consumeStream = async () => {
      try {
        // NOTE the generated client has reconnect and back-off built-in so
        // we don't have to handle it here. By default it will retry until aborted.
        const result = await getConsoleUpdates(controller.signal, { minDelay, maxDelay });
        for await (const event of result.stream) {
          if (controller.signal.aborted) return;
          dispatch(setAgentError(''));
          if (event.view) {
            navigateToQueryRef.current(Query.parse(event.view), null);
          }
          if (event.search) {
            const s = fromAPISearch(event.search);
            if (s) {
              dispatch(setSearch(s));
              dispatch(openTP());
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        dispatch(setAgentError(err?.message || String(err)));
      }
    };
    consumeStream();
    return () => controller.abort();
  }, [agentEnabled, minDelay, maxDelay, dispatch]);

  // Send console updates when view or search changes.
  useEffect(() => {
    if (!agentEnabled) return;
    const body = {
      view,
      search: isOpen ? toAPISearch(search) : undefined,
    };
    if (!body.view && !body.search) return;

    const controller = new AbortController();
    const sendWithRetry = async () => {
      let backoff = minDelay;
      while (!controller.signal.aborted) {
        try {
          await sendConsoleUpdate(body, controller.signal);
          dispatch(setAgentError(''));
          return;
        } catch (err) {
          if (controller.signal.aborted) return;
          dispatch(setAgentError(err?.message || String(err)));
          await sleep(backoff, controller.signal);
          backoff = Math.min(backoff * 2, maxDelay);
        }
      }
    };
    sendWithRetry();
    return () => controller.abort();
  }, [view, search, isOpen, agentEnabled, minDelay, maxDelay, dispatch]);
};

export default useAgentNavigation;

export const toAPISearch = (search: Search): api.Search | undefined => {
  if (!search?.queryStr) return undefined;
  const start: api.Start = { queries: [search.queryStr] };
  switch (search.searchType) {
    case SearchType.Goal:
      return { goals: { start, goals: [search.goal] } };
    case SearchType.Depth:
      return { neighbors: { start, depth: search.depth } };
    default:
      return undefined;
  }
};

export const fromAPISearch = (search: api.Search): Search | undefined => {
  let result: Search | undefined = undefined;
  if (search.goals && !search.neighbors) {
    result = {
      queryStr: search.goals.start?.queries?.[0],
      searchType: SearchType.Goal,
      goal: search.goals.goals?.[0],
    };
  }
  if (search.neighbors && !search.goals) {
    result = {
      queryStr: search.neighbors.start?.queries?.[0],
      searchType: SearchType.Depth,
      depth: search.neighbors.depth || defaultSearch.depth,
    };
  }
  return result?.queryStr ? result : undefined;
};
