import {
  Button,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  Spinner,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  CubesIcon,
  ExclamationCircleIcon,
  LinkIcon,
  SlidersHIcon,
  SyncIcon,
  UnlinkIcon,
} from '@patternfly/react-icons';
import * as React from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocationQuery } from '../hooks/useLocationQuery';
import { usePluginAvailable } from '../hooks/usePluginAvailable';
import { getGoalsGraph, getNeighborsGraph, replaceTraceStore } from '../korrel8r-client';
import * as api from '../korrel8r/client';
import * as korrel8r from '../korrel8r/types';
import {
  defaultSearch,
  Result,
  Search,
  SearchType,
  setResult,
  setSearch,
  setTraceContext,
} from '../redux-actions';
import { State } from '../redux-reducers';
import { buildTraceStoreConfig, extractTraceContext, TraceContext } from '../utils/traceStoreUtils';
import * as time from '../time';
import { AdvancedSearchForm } from './AdvancedSearchForm';
import './korrel8rpanel.css';
import { TimeRangeDropdown } from './TimeRangeDropdown';
import { Korrel8rTopology } from './topology/Korrel8rTopology';

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const dispatch = useDispatch();
  const locationQuery = useLocationQuery();

  const search: Search = useSelector((state: State) => state.plugins?.tp?.get('search'));
  const result: Result | null = useSelector((state: State) => state.plugins?.tp?.get('result'));
  const storedTraceContext: TraceContext | null = useSelector((state: State) =>
    state.plugins?.tp?.get('traceContext'),
  );

  // Disable focus button if the panel is already focused on the current location,
  // or the current result is an error.
  const isFocused = React.useMemo(
    () => locationQuery?.toString() === search.queryStr && !result?.isError,
    [locationQuery, search.queryStr, result?.isError],
  );

  // Showing advanced query
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Compute constraint from search period.
  const constraint = React.useMemo((): korrel8r.Constraint | undefined => {
    if (!search.period) return undefined;
    const [start, end] = search.period.startEnd();
    return new korrel8r.Constraint({ start, end });
  }, [search?.period]);

  // Dispatch a new search value, making a new reference (reducer clears result automatically).
  const dispatchSearch = React.useCallback(
    (search: Search) => dispatch(setSearch({ ...search })),
    [dispatch],
  );
  // Dispatch a new result, no special actions.
  const dispatchResult = React.useCallback(
    (result: Result) => dispatch(setResult(result)),
    [dispatch],
  );

  // Create the initial result on startup.
  // Use the current location or an explicit "Empty" result.
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!search?.queryStr && !result) {
      if (locationQuery?.toString())
        dispatchSearch({ ...defaultSearch, queryStr: locationQuery.toString() });
      else
        dispatchResult({
          title: t('Empty Query'),
          message: t('No starting point for correlation'),
        });
    }
  }, [locationQuery, dispatchSearch, dispatchResult, search?.queryStr, result, t]);

  // Skip the first fetch if we already have a stored result.
  const useStoredResult = React.useRef(result != null);

  // Helper function to check if two TraceContexts are different
  const traceContextsDiffer = (a: TraceContext | null, b: TraceContext | null): boolean => {
    if (!a && !b) return false;
    if (!a || !b) return true;
    return a.namespace !== b.namespace || a.name !== b.name || a.tenant !== b.tenant;
  };

  // Fetch a new result from the korrel8r service when the search changes.
  React.useEffect(() => {
    if (useStoredResult.current) {
      useStoredResult.current = false; // Fetch a new result next time.
      return;
    }
    const queryStr = search?.queryStr;
    if (!queryStr) return;

    let cancelled = false;

    // Check if we need to update the trace store based on current URL
    const currentTraceContext = extractTraceContext();
    const needsTraceStoreUpdate = traceContextsDiffer(currentTraceContext, storedTraceContext);

    // Helper to perform the korrel8r fetch
    const performFetch = () => {
      const start: api.Start = {
        queries: [queryStr],
        constraint: constraint?.toAPI(),
      };

      const fetch =
        search.searchType === SearchType.Goal
          ? getGoalsGraph({ start, goals: [search.goal] })
          : getNeighborsGraph({ start, depth: search.depth });
      fetch
        .then((response: api.Graph) => {
          if (cancelled) return;
          dispatchResult(
            Array.isArray(response?.nodes) && response.nodes.length > 0
              ? { graph: new korrel8r.Graph(response) }
              : { title: t('Empty Result'), message: t('No correlated data found') },
          );
        })
        .catch((e: api.ApiError) => {
          if (cancelled) return;
          dispatchResult({
            title: e?.body?.error ? t('Search Error') : t('Search Failed'),
            message: e?.body?.error || e.message || 'Unknown Error',
            isError: true,
          });
        });
      return fetch;
    };

    // If trace context changed, update the backend trace store first
    if (needsTraceStoreUpdate && currentTraceContext) {
      const storeConfig = buildTraceStoreConfig(currentTraceContext);
      const timeoutMs = 3000;

      Promise.race([
        replaceTraceStore(storeConfig),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Trace store update timed out')), timeoutMs),
        ),
      ])
        .then(() => {
          if (cancelled) return;
          // eslint-disable-next-line no-console
          console.log('Trace store updated for tenant:', currentTraceContext.tenant);
          dispatch(setTraceContext(currentTraceContext));
          performFetch();
        })
        .catch((error) => {
          if (cancelled) return;
          // Log error but continue with fetch - panel will work with other domains
          // eslint-disable-next-line no-console
          console.error('Failed to update trace store:', error);
          dispatch(setTraceContext(currentTraceContext));
          performFetch();
        });
    } else {
      // No trace context change, just perform the fetch
      performFetch();
    }

    return () => {
      cancelled = true;
    };
  }, [search, constraint, dispatchResult, dispatch, storedTraceContext, t]);

  const advancedToggleID = 'query-toggle';
  const advancedContentID = 'query-content';

  return (
    <>
      <Stack>
        <Flex
          className="tp-plugin__panel-toolbar"
          direction={{ default: 'row' }}
          flexWrap={{ default: 'wrap' }}
          alignItems={{ default: 'alignItemsCenter' }}
          spaceItems={{ default: 'spaceItemsXs' }}
        >
          <Tooltip
            position="bottom-start"
            content={
              locationQuery
                ? isFocused
                  ? t('Correlation graph is focused on the current view.')
                  : t('Focus the correlation on the current view.')
                : t('Current view does not provide a starting point for correlation')
            }
          >
            <Button
              className="tp-plugin__compact-control"
              isAriaDisabled={!locationQuery || isFocused}
              size="sm"
              onClick={() => {
                dispatchSearch({
                  ...defaultSearch,
                  queryStr: locationQuery?.toString(),
                  period: search?.period,
                });
              }}
              icon={isFocused ? <LinkIcon /> : <UnlinkIcon />}
            >
              {t('Focus')}
            </Button>
          </Tooltip>

          {/* Time range drop-down */}
          <Flex align={{ default: 'alignRight' }} spaceItems={{ default: 'spaceItemsNone' }}>
            <TimeRangeDropdown
              className="tp-plugin__compact-control"
              period={search.period ?? defaultSearch.period}
              onChange={(period: time.Period) => dispatchSearch({ ...search, period })}
            />
          </Flex>

          {/* Right aligned buttons */}
          <Flex align={{ default: 'alignRight' }} spaceItems={{ default: 'spaceItemsNone' }}>
            {/* Advanced search toggle */}
            <Tooltip content={t('Advanced search parameters')} position="bottom-end">
              <ExpandableSectionToggle
                contentId={advancedContentID}
                toggleId={advancedToggleID}
                isExpanded={showAdvanced}
                onToggle={(on: boolean) => setShowAdvanced(on)}
                aria-label={t('Advanced search parameters')}
              >
                <SlidersHIcon />
              </ExpandableSectionToggle>
            </Tooltip>

            {/* Refresh button */}
            <Tooltip content={t('Refresh the graph by re-running the current search.')}>
              <Button
                variant="link"
                size="sm"
                isAriaDisabled={!search?.queryStr}
                onClick={() => dispatchSearch(search)}
                aria-label={t('Refresh')}
              >
                <SyncIcon />
              </Button>
            </Tooltip>
          </Flex>
        </Flex>

        <ExpandableSection
          className="tp-plugin__panel-query-container"
          contentId={advancedContentID}
          toggleId={advancedToggleID}
          isExpanded={showAdvanced}
          isDetached
        >
          <AdvancedSearchForm
            search={search}
            onSearch={dispatchSearch}
            onCancel={() => setShowAdvanced(false)}
          />
        </ExpandableSection>

        <Divider />

        <StackItem className="tp-plugin__panel-topology-container" isFilled={true}>
          <Topology result={result} t={t} constraint={constraint} />
        </StackItem>
      </Stack>
    </>
  );
}

interface TopologyProps {
  result?: Result;
  constraint?: korrel8r.Constraint;
  t: TFunction;
}

const Topology: React.FC<TopologyProps> = ({ result, t, constraint }) => {
  const [loggingAvailable, loggingAvailableLoading] = usePluginAvailable('logging-view-plugin');
  const [netobserveAvailable, netobserveAvailableLoading] = usePluginAvailable('netobserv-plugin');

  if (!result || loggingAvailableLoading || netobserveAvailableLoading) {
    // korrel8r query is loading or the plugin checks are loading
    return <Searching />;
  }

  if (result?.graph?.nodes) {
    // Non-empty graph
    return (
      <Korrel8rTopology
        graph={result.graph}
        loggingAvailable={loggingAvailable}
        netobserveAvailable={netobserveAvailable}
        constraint={constraint}
      />
    );
  }

  return (
    <TopologyInfoState
      titleText={result.title || t('No Correlated Signals Found')}
      // Only display fisrt 400 characters of error to prevent repeating errors
      text={result.message ? result.message.slice(0, 400) : t('Correlation result was empty.')}
      isError={result.isError}
    />
  );
};

const Searching: React.FC = () => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState
        variant={EmptyStateVariant.sm}
        titleText={t('Searching')}
        headingLevel="h4"
        icon={Spinner}
      />
    </div>
  );
};

interface TopologyInfoStateProps {
  titleText: string;
  text: string;
  isError?: boolean;
}

const TopologyInfoState: React.FC<TopologyInfoStateProps> = ({ titleText, text, isError }) => {
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState
        variant={EmptyStateVariant.sm}
        titleText={titleText}
        headingLevel="h4"
        icon={isError ? ExclamationCircleIcon : CubesIcon}
        status={isError ? 'danger' : undefined}
      >
        <EmptyStateBody>{text}</EmptyStateBody>
      </EmptyState>
    </div>
  );
};
