import {
  Button,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
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
import { getGoalsGraph, getNeighborsGraph } from '../korrel8r-client';
import * as api from '../korrel8r/client';
import * as korrel8r from '../korrel8r/types';
import {
  defaultSearch,
  Result,
  Search,
  SearchType,
  setResult as setResultAction,
  setSearch as setSearchAction,
} from '../redux-actions';
import { State } from '../redux-reducers';
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

  // Is the search panel already in focus on the main view?
  const isFocused = React.useMemo(
    () => locationQuery?.toString() === search.queryStr,
    [locationQuery, search.queryStr],
  );

  // Showing advanced query
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Compute constraint from period for the API call and topology navigation.
  const constraint = React.useMemo((): korrel8r.Constraint | undefined => {
    if (!search.period) return undefined;
    const [pStart, pEnd] = search.period.startEnd();
    return new korrel8r.Constraint({ start: pStart, end: pEnd });
  }, [search.period]);

  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (initialized.current) return; // Run once on mount
    initialized.current = true;
    if (!search?.queryStr && locationQuery) {
      dispatch(setSearchAction({ ...defaultSearch, queryStr: locationQuery.toString() }));
    }
  }, [search?.queryStr, locationQuery, dispatch]);

  React.useEffect(() => {
    // Leave stored result in place if there is one.
    // Dispatching SetSearch clears result to null, triggering a new fetch.
    if (result) return;

    const queryStr = search?.queryStr?.trim();
    const start: api.Start = {
      queries: queryStr ? [queryStr] : undefined,
      constraint: constraint?.toAPI(),
    };
    let cancelled = false;
    const onResult = (newResult: Result) => {
      if (!cancelled) dispatch(setResultAction(newResult));
    };
    const fetch =
      search.searchType === SearchType.Goal
        ? getGoalsGraph({ start, goals: [search.goal] })
        : getNeighborsGraph({ start, depth: search.depth });
    fetch
      .then((response: api.Graph) => onResult({ graph: new korrel8r.Graph(response) }))
      .catch((e: api.ApiError) => {
        onResult({
          title: e?.body?.error ? t('Korrel8r Error') : t('Request Failed'),
          message: e?.body?.error || e.message || 'Unknown Error',
        });
      });
    return () => {
      cancelled = true;
      fetch.cancel();
    };
  }, [search, t, result, constraint, dispatch]);

  const advancedToggleID = 'query-toggle';
  const advancedContentID = 'query-content';

  // Dispatch a new search.
  // The SetSearch reducer clears result, triggering the fetch effect.
  const doSearch = React.useCallback((s: Search) => dispatch(setSearchAction(s)), [dispatch]);

  return (
    <>
      <Stack>
        <Flex
          className="tp-plugin__panel-toolbar"
          direction={{ default: 'row' }}
          flexWrap={{ default: 'nowrap' }}
          alignItems={{ default: 'alignItemsCenter' }}
          spaceItems={{ default: 'spaceItemsXs' }}
        >
          <Tooltip
            content={
              locationQuery
                ? isFocused
                  ? t('Correlation graph is focused on the main view.')
                  : t('Focus the correlation on the main view.')
                : t('Current view does not allow correlation.')
            }
          >
            <Button
              className="tp-plugin__compact-control"
              isAriaDisabled={!locationQuery || isFocused}
              size="sm"
              onClick={() => {
                doSearch({
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
            <Tooltip content={t('Include data from this time range')}>
              <TimeRangeDropdown
                className="tp-plugin__compact-control"
                period={search.period ?? defaultSearch.period}
                onChange={(period: time.Period) => doSearch({ ...search, period })}
              />
            </Tooltip>
          </Flex>

          {/* Right aligned buttons */}
          <Flex align={{ default: 'alignRight' }} spaceItems={{ default: 'spaceItemsNone' }}>
            {/* Advanced search toggle */}
            <Tooltip content={t('Advanced search parameters')}>
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
                onClick={() => doSearch(search)}
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
            onSearch={doSearch}
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
      <EmptyState variant={EmptyStateVariant.sm}>
        <EmptyStateHeader
          titleText={t('Searching')}
          headingLevel="h4"
          icon={<EmptyStateIcon icon={Spinner} />}
        />
      </EmptyState>
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
      <EmptyState variant={EmptyStateVariant.sm}>
        <EmptyStateHeader
          titleText={titleText}
          headingLevel="h4"
          icon={
            <EmptyStateIcon
              icon={isError ? ExclamationCircleIcon : CubesIcon}
              color={isError ? 'var(--pf-v5-global--danger-color--100)' : ''}
            />
          }
        />
        <EmptyStateBody>{text}</EmptyStateBody>
      </EmptyState>
    </div>
  );
};
