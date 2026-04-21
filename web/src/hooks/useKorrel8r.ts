import * as React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { consoleEvents, retryWithBackoff, setConsole } from '../korrel8r-client';
import { Query } from '../korrel8r/types';
import { apiSearch, openTP, reduxSearch, Search, setAgentError, setSearch } from '../redux-actions';
import { State } from '../redux-reducers';
import { useLocationQuery } from './useLocationQuery';
import { useNavigateToQuery } from './useNavigateToQuery';

// This hook sets up two-way communication with an AI agent, using Korrel8r as a bridge.
// - Changes to the console view are posted to korrel8r, where the agent can retrieve them.
// - This hook listens for events indicating the agent wants to change the console view.
// minDelay, maxDelay are back-off parameters.
const useKorrel8r = ({
  minDelay = 100,
  maxDelay = 5000,
}: { minDelay?: number; maxDelay?: number } = {}) => {
  const dispatch = useDispatch();
  const view = useLocationQuery()?.toString() ?? '';
  const search: Search = useSelector((state: State) => state.plugins?.tp?.get('search'), shallowEqual);
  const isOpen: boolean = useSelector((state: State) => state.plugins?.tp?.get('isOpen'));
  const navigateToQuery = useNavigateToQuery();

  const error = React.useCallback(
    (error: string, what = '') => {
      dispatch(setAgentError(error));
      if (error) {
        // eslint-disable-next-line no-console
        console.error(`korrel8r ${what}: ${error}`);
      }
    },
    [dispatch],
  );

  // Post console updates to korrel8r with retry and backoff.
  // Post when state changes or we (re)connect to korrel8r.
  React.useEffect(() => {
    return retryWithBackoff(
      async (signal) => {
        const req = setConsole({
          view,
          search: isOpen && search ? apiSearch(search) : undefined,
        });
        signal.addEventListener('abort', () => req.cancel(), { once: true });
        await req;
        error('');
      },
      (err) => error(err?.body?.error || err?.message || String(err), 'console send'),
      { minDelay, maxDelay },
    );
  }, [view, search, isOpen, minDelay, maxDelay, error]);

  // Ref for values used in SSE callback that shouldn't trigger reconnection.
  const ref = React.useRef({ navigateToQuery, search });
  React.useEffect(() => {
    ref.current.navigateToQuery = navigateToQuery;
    ref.current.search = search;
  });

  // Subscribe to console update events from the agent.
  // The eventStream handles reconnection with exponential backoff internally.
  React.useEffect(() => {
    return consoleEvents(
      (event) => {
        try {
          // eslint-disable-next-line no-console
          console.debug(`korrel8r console event: ${JSON.stringify(event)}`);
          if (event.view) {
            ref.current.navigateToQuery(Query.parse(event.view));
          }
          if (event.search) {
            dispatch(setSearch({ ...ref.current.search, ...reduxSearch(event.search) }));
            dispatch(openTP());
          }
        } catch (err) {
          error(String(err), 'console event');
        }
      },
      (err) => error(String(err), 'console subscription'),
      () => error(''),
      { minDelay, maxDelay },
    );
  }, [minDelay, maxDelay, dispatch, error]);
};

export default useKorrel8r;
