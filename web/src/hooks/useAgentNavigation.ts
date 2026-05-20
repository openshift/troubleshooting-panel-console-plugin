import * as React from 'react';
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
  minDelay = 500,
  maxDelay = 5000,
}: { minDelay?: number; maxDelay?: number } = {}) => {
  const agentEnabled: boolean = useSelector((s: State) => s.plugins?.tp?.get('agentEnabled'));
  const view = useLocationQuery()?.toString();
  const search: Search = useSelector((s: State) => s.plugins?.tp?.get('search'), shallowEqual);
  const isOpen: boolean = useSelector((s: State) => s.plugins?.tp?.get('isOpen'));
  const dispatch = useDispatch();
  const navigateToQuery = useNavigateToQuery();

  const navigateToQueryRef = React.useRef(navigateToQuery);
  React.useEffect(() => {
    navigateToQueryRef.current = navigateToQuery;
  });

  // Set on connection to trigger an initial send of current state.
  const [needSend, setNeedSend] = React.useState(false);

  // Handle console update events via an SSE stream.
  // Endless loop to stay constantly connected to the agent.
  React.useEffect(() => {
    if (!agentEnabled) {
      dispatch(setAgentError(''));
      return;
    }

    const controller = new AbortController();
    const consumeStream = async () => {
      while (!controller.signal.aborted) {
        try {
          const result = await getConsoleUpdates(controller.signal, {
            minDelay,
            maxDelay,
            onSseError: (err: unknown) => {
              if (!controller.signal.aborted) {
                dispatch(setAgentError((err as Error)?.message || String(err)));
              }
            },
          });
          setNeedSend(true);
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
          dispatch(setAgentError((err as Error)?.message || String(err)));
        }
        setNeedSend(false);
        await sleep(minDelay, controller.signal);
      }
    };
    consumeStream();
    return () => controller.abort();
  }, [agentEnabled, minDelay, maxDelay, dispatch]);

  // Send console updates when local view or search changes, or on connect.
  React.useEffect(() => {
    if (!agentEnabled || !needSend) return;
    const controller = new AbortController();
    const sendWithRetry = async () => {
      let backoff = minDelay;
      while (!controller.signal.aborted) {
        try {
          await sendConsoleUpdate(
            { view, search: isOpen ? toAPISearch(search) : undefined },
            controller.signal,
          );
          if (controller.signal.aborted) return;
          dispatch(setAgentError(''));
          return;
        } catch (err) {
          if (controller.signal.aborted) return;
          dispatch(setAgentError((err as Error)?.message || String(err)));
          await sleep(backoff, controller.signal);
          backoff = Math.min(backoff * 2, maxDelay);
        }
      }
    };
    sendWithRetry();
    return () => controller.abort();
  }, [view, search, isOpen, agentEnabled, needSend, minDelay, maxDelay, dispatch]);
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
  if (search.goals && search.neighbors) return undefined; // Invalid to  set both
  let result: Search | undefined;
  if (search.goals) {
    result = {
      queryStr: search.goals.start?.queries?.[0],
      searchType: SearchType.Goal,
      goal: search.goals.goals?.[0],
    };
  } else if (search.neighbors) {
    result = {
      queryStr: search.neighbors.start?.queries?.[0],
      searchType: SearchType.Depth,
      depth: search.neighbors.depth || defaultSearch.depth,
    };
  }
  return result?.queryStr ? result : undefined;
};
